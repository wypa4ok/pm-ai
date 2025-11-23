import nodemailer from "nodemailer";

type InviteEmailPayload = {
  email: string;
  tenantName?: string;
  inviteLink: string;
  expiresAt: Date;
  ownerEmail?: string;
};

export async function sendTenantInviteEmail(payload: InviteEmailPayload) {
  const fromAddress = process.env.GMAIL_FROM_ADDRESS;

  if (!fromAddress) {
    console.warn("GMAIL_FROM_ADDRESS missing; logging invite instead.", payload);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: fromAddress,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
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
}
