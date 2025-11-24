# Gmail App Password Setup (Simpler Alternative)

If you're having trouble with OAuth2, using a Gmail App Password is much simpler and more reliable.

## Prerequisites

- Gmail account
- 2-Step Verification enabled

## Step 1: Enable 2-Step Verification

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", find **2-Step Verification**
3. If it shows "Off", click **Get Started** and follow the prompts
4. Verify with your phone number
5. Click **Turn On**

## Step 2: Generate App Password

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - If you don't see this option, make sure 2-Step Verification is enabled
   - Wait a few minutes after enabling 2-Step if the option doesn't appear

2. You may need to sign in again

3. Under "Select app", choose **Mail**

4. Under "Select device", choose **Other (Custom name)**

5. Enter a name like: `Rental Ops App`

6. Click **Generate**

7. Google will show you a 16-character password like: `abcd efgh ijkl mnop`

8. **Copy this password** (you won't be able to see it again)

## Step 3: Update Your Environment Variables

Edit your `.env` or `.env.local` file:

```env
# Gmail Configuration (App Password method)
GMAIL_FROM_ADDRESS=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop

# Note: Remove spaces from the app password
# Google shows it as: abcd efgh ijkl mnop
# You should save it as: abcdefghijklmnop
```

**Important**: Remove all spaces from the app password when adding it to `.env`.

## Step 4: Update the Code to Use App Password

You have two options:

### Option A: Switch to App Password Method (Recommended)

Update [src/server/integrations/invite-email.ts](../src/server/integrations/invite-email.ts):

```typescript
import nodemailer from "nodemailer";

export async function sendTenantInviteEmail(payload: InviteEmailPayload) {
  const fromAddress = process.env.GMAIL_FROM_ADDRESS;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (!fromAddress || !appPassword) {
    console.warn("Gmail not configured; logging invite instead.");
    console.log("Invite link:", payload.inviteLink);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: fromAddress,
      pass: appPassword,
    },
  });

  // ... rest of the email sending code
}
```

### Option B: Use the Pre-Made Simple Version

1. Replace the import in [src/server/services/tenant-invite.ts](../src/server/services/tenant-invite.ts):

```typescript
// Change this:
import { sendTenantInviteEmail } from "../integrations/invite-email";

// To this:
import { sendTenantInviteEmailSimple as sendTenantInviteEmail } from "../integrations/invite-email-simple";
```

2. That's it! The simple version uses App Password automatically.

## Step 5: Restart and Test

1. **Restart your Next.js development server**:
   ```bash
   # Stop the server (Ctrl+C)
   # Start it again
   npm run dev
   ```

2. Try sending an invite again

3. Check your console - you should see:
   ```
   Gmail App Password Configuration:
     From Address: your-email@gmail.com
     App Password: SET (hidden)
   ✅ Invite email sent successfully to: tenant@example.com
   ```

## Troubleshooting

### Error: "Username and Password not accepted"

**Cause**: App Password is incorrect or has spaces

**Fix**:
1. Make sure you removed ALL spaces from the password
2. Copy the password exactly as shown by Google (without spaces)
3. Check for any extra characters or line breaks in your `.env` file

### Error: "App Passwords not available"

**Cause**: 2-Step Verification is not enabled or not fully activated

**Fix**:
1. Verify 2-Step Verification is ON at [Google Security](https://myaccount.google.com/security)
2. Wait 5-10 minutes after enabling it
3. Try accessing [App Passwords](https://myaccount.google.com/apppasswords) again

### Error: "EAUTH" or "ECONNECTION"

**Cause**: Firewall or network issue

**Fix**:
1. Check you can access Gmail from your network
2. Try using port 587 instead of 465
3. If behind a corporate firewall, you may need to allow SMTP traffic

## Security Notes

✅ **App Passwords are more secure than you might think:**
- They're specific to one app (can't be used to sign in to your Google account)
- You can revoke them anytime without changing your main password
- They work even if you change your main Google password

❌ **Never commit your App Password to version control:**
- Keep it in `.env` or `.env.local` (these should be in `.gitignore`)
- Don't share your `.env` file
- Rotate the password periodically for security

## Comparison: OAuth2 vs App Password

| Feature | OAuth2 | App Password |
|---------|--------|--------------|
| Setup Complexity | Complex (10+ steps) | Simple (3 steps) |
| Reliability | Can break (tokens expire) | Very reliable |
| Security | Slightly better (can auto-refresh) | Good (app-specific) |
| Maintenance | Requires token refresh | None |
| Google Workspace | May need admin approval | Works immediately |

**Recommendation**: For this project, **App Password is simpler and more reliable**. Use it unless you have specific requirements for OAuth2.

## Reverting to OAuth2 Later

If you want to switch back to OAuth2 later:

1. Keep your OAuth2 credentials in `.env`:
   ```env
   # OAuth2 (alternative)
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GMAIL_REFRESH_TOKEN=...
   ```

2. Comment out the App Password:
   ```env
   # GMAIL_APP_PASSWORD=...
   ```

3. Revert the code changes

You can have both sets of credentials and switch between them easily.
