import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

type InviteEmailPayload = {
  email: string;
  tenantName?: string;
  inviteLink: string;
  expiresAt: Date;
  ownerEmail?: string;
};

async function sendEmail(
  transporter: Transporter,
  fromAddress: string,
  payload: InviteEmailPayload,
) {
  const subject = "You're invited to the Rental Ops tenant portal";
  const textBody = [
    `Hi ${payload.tenantName ?? "there"},`,
    "",
    "You've been invited to access the tenant portal to track maintenance requests and updates.",
    "Click the link below to accept your invite:",
    payload.inviteLink,
    "",
    `This invite expires on ${payload.expiresAt.toLocaleDateString()}.`,
    payload.ownerEmail
      ? `If you didn't expect this invite, contact ${payload.ownerEmail}.`
      : "",
    "",
    "Thanks,",
    "Rental Ops",
  ]
    .filter(Boolean)
    .join("\n");

  const htmlBody = `
    <p>Hi ${payload.tenantName ?? "there"},</p>
    <p>You've been invited to access the tenant portal to track maintenance requests and updates.</p>
    <p><a href="${payload.inviteLink}" target="_blank" rel="noopener">Accept your invite</a></p>
    <p>This invite expires on <strong>${payload.expiresAt.toLocaleDateString()}</strong>.</p>
    ${
      payload.ownerEmail
        ? `<p>If you didn't expect this invite, contact ${payload.ownerEmail}.</p>`
        : ""
    }
    <p>Thanks,<br/>Rental Ops</p>
  `;

  await transporter.sendMail({
    from: fromAddress,
    to: payload.email,
    subject,
    text: textBody,
    html: htmlBody,
  });
}

export async function sendTenantInviteEmail(payload: InviteEmailPayload) {
  const fromAddress = process.env.GMAIL_FROM_ADDRESS;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (!fromAddress) {
    console.warn("GMAIL_FROM_ADDRESS missing; logging invite instead.", payload);
    console.log("Invite link:", payload.inviteLink);
    return;
  }

  // Use App Password if available (simpler and more reliable)
  if (appPassword) {
    console.log("Gmail App Password Configuration:");
    console.log("  From Address:", fromAddress);
    console.log("  App Password:", "SET (hidden)");

    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: fromAddress,
          pass: appPassword,
        },
      });

      await sendEmail(transporter, fromAddress, payload);
      console.log("✅ Invite email sent successfully to:", payload.email);
      return;
    } catch (error) {
      console.error("❌ Failed to send invite email:", error);
      console.log("Invite link (share manually):", payload.inviteLink);
      return;
    }
  }

  // Fallback to OAuth2 if App Password not set
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  console.log("Gmail OAuth Configuration:");
  console.log("  From Address:", fromAddress);
  console.log("  Client ID:", clientId ? `${clientId.substring(0, 30)}...` : "NOT SET");
  console.log("  Client Secret:", clientSecret ? `${clientSecret.substring(0, 10)}... (SET)` : "NOT SET");
  console.log("  Refresh Token:", refreshToken ? `${refreshToken.substring(0, 20)}...` : "NOT SET");

  if (!clientId || !clientSecret || !refreshToken) {
    console.error("❌ Missing Gmail credentials!");
    console.error("Please set either:");
    console.error("  - GMAIL_APP_PASSWORD (recommended, simpler)");
    console.error("  OR");
    console.error("  - GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GMAIL_REFRESH_TOKEN");
    console.log("Invite link (share manually):", payload.inviteLink);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        type: "OAuth2",
        user: fromAddress,
        clientId,
        clientSecret,
        refreshToken,
        accessUrl: "https://oauth2.googleapis.com/token",
      },
    });

    await sendEmail(transporter, fromAddress, payload);
    console.log("✅ Invite email sent successfully to:", payload.email);
  } catch (error) {
    console.error("Failed to send invite email:", error);
    console.log("Invite link (share manually):", payload.inviteLink);
    // Don't throw - allow the invite to be created even if email fails
  }
}
