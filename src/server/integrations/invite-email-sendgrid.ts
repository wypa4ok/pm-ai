/**
 * SendGrid implementation for tenant invite emails
 *
 * Setup:
 * 1. Sign up at https://sendgrid.com
 * 2. Create API key in Settings > API Keys
 * 3. Verify sender email/domain in Settings > Sender Authentication
 * 4. Add to .env:
 *    SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *    SENDGRID_FROM_EMAIL=noreply@yourdomain.com
 *    SENDGRID_FROM_NAME=Rental Ops
 */

type InviteEmailPayload = {
  email: string;
  tenantName?: string;
  inviteLink: string;
  expiresAt: Date;
  ownerEmail?: string;
  ownerName?: string;
};

export async function sendTenantInviteEmailSendGrid(payload: InviteEmailPayload) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@yourdomain.com";
  const fromName = process.env.SENDGRID_FROM_NAME || "Rental Ops";

  if (!apiKey) {
    console.warn("SENDGRID_API_KEY missing; logging invite instead.");
    console.log("Invite link:", payload.inviteLink);
    return;
  }

  const ownerInfo = payload.ownerName || payload.ownerEmail || "your property manager";

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: payload.email, name: payload.tenantName }],
            dynamic_template_data: {
              tenant_name: payload.tenantName || "there",
              invite_link: payload.inviteLink,
              expires_date: payload.expiresAt.toLocaleDateString(),
              owner_info: ownerInfo,
            },
          },
        ],
        from: {
          email: fromEmail,
          name: fromName,
        },
        reply_to: payload.ownerEmail
          ? {
              email: payload.ownerEmail,
              name: payload.ownerName,
            }
          : undefined,
        subject: "You're invited to your tenant portal",
        content: [
          {
            type: "text/plain",
            value: [
              `Hi ${payload.tenantName || "there"},`,
              "",
              `${ownerInfo} has invited you to access your tenant portal to track maintenance requests and updates.`,
              "",
              "Click the link below to accept your invite:",
              payload.inviteLink,
              "",
              `This invite expires on ${payload.expiresAt.toLocaleDateString()}.`,
              payload.ownerEmail
                ? `If you have questions, contact ${ownerInfo} at ${payload.ownerEmail}.`
                : "",
              "",
              "Thanks,",
              fromName,
            ]
              .filter(Boolean)
              .join("\n"),
          },
          {
            type: "text/html",
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to Your Tenant Portal</h2>
                <p>Hi ${payload.tenantName || "there"},</p>
                <p>${ownerInfo} has invited you to access your tenant portal to track maintenance requests and updates.</p>
                <p style="margin: 30px 0;">
                  <a href="${payload.inviteLink}"
                     style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Accept Invitation
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                  This invite expires on <strong>${payload.expiresAt.toLocaleDateString()}</strong>.
                </p>
                ${
                  payload.ownerEmail
                    ? `<p style="color: #666; font-size: 14px;">If you have questions, contact ${ownerInfo} at <a href="mailto:${payload.ownerEmail}">${payload.ownerEmail}</a>.</p>`
                    : ""
                }
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">
                  ${fromName}<br>
                  You received this email because ${ownerInfo} invited you to their tenant portal.
                </p>
              </div>
            `,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error}`);
    }

    console.log("✅ Invite email sent successfully via SendGrid to:", payload.email);
  } catch (error) {
    console.error("❌ Failed to send invite email via SendGrid:", error);
    console.log("Invite link (share manually):", payload.inviteLink);
    throw error;
  }
}
