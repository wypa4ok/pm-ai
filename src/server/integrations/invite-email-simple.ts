import nodemailer from "nodemailer";

type InviteEmailPayload = {
  email: string;
  tenantName?: string;
  inviteLink: string;
  expiresAt: Date;
  ownerEmail?: string;
};

/**
 * Simplified email sending using App Password instead of OAuth2
 *
 * Setup:
 * 1. Enable 2-Step Verification on your Google Account
 * 2. Go to https://myaccount.google.com/apppasswords
 * 3. Create an App Password for "Mail"
 * 4. Add to .env:
 *    GMAIL_FROM_ADDRESS=your-email@gmail.com
 *    GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
 */
export async function sendTenantInviteEmailSimple(payload: InviteEmailPayload) {
  const fromAddress = process.env.GMAIL_FROM_ADDRESS;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (!fromAddress || !appPassword) {
    console.warn("GMAIL_FROM_ADDRESS or GMAIL_APP_PASSWORD missing; logging invite instead.");
    console.log("Invite link:", payload.inviteLink);
    return;
  }

  console.log("Gmail App Password Configuration:");
  console.log("  From Address:", fromAddress);
  console.log("  App Password:", appPassword ? "SET (hidden)" : "NOT SET");

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

    console.log("✅ Invite email sent successfully to:", payload.email);
  } catch (error) {
    console.error("❌ Failed to send invite email:", error);
    console.log("Invite link (share manually):", payload.inviteLink);
    throw error;
  }
}
