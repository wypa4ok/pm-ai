# Gmail OAuth Setup

Follow these steps to connect a Gmail account and capture the credentials used by the adapters in this repo.

## 1. Create / configure the Google Cloud project

1. Visit <https://console.cloud.google.com/> and either create a new project or pick an existing one that can access Gmail.
2. In **APIs & Services → Enabled APIs & services**, click **Enable APIs and Services**, search for **Gmail API**, and enable it for the project.
3. Under **OAuth consent screen**, configure an internal or external consent screen. Add the scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
   - (optional) `https://www.googleapis.com/auth/gmail.labels` if you plan to manage labels programmatically.
   Add the Gmail account you plan to use as a test user if the consent screen is still in testing mode.

## 2. Create OAuth client credentials

1. Navigate to **APIs & Services → Credentials** and click **Create credentials → OAuth client ID**.
2. Choose **Web application**.
3. Add `http://localhost:3000/api/integrations/gmail/oauth/callback` to the list of authorized redirect URIs (add your production domain later).
4. Save and copy the **Client ID** and **Client secret**.

Store them in `.env.local`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GMAIL_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/oauth/callback
```

## 3. Generate a refresh token

The Gmail adapter expects a long-lived refresh token. One quick way to obtain it is with the Google APIs OAuth playground.

1. Visit <https://developers.google.com/oauthplayground>.
2. Open the gear icon (settings) and check **Use your own OAuth credentials**. Paste your client ID and secret.
3. In **Step 1**, find *Gmail API v1* and authorise the scopes listed earlier (read, send, modify, labels).
4. Click **Authorize APIs** and sign in with the Gmail account you want the app to use.
5. In **Step 2**, click **Exchange authorization code for tokens**.
6. Copy the **Refresh token** and add it to `.env.local`:

```env
GMAIL_REFRESH_TOKEN=...
GMAIL_FROM_ADDRESS=your-address@gmail.com
GMAIL_LABEL=PM/Inbound
GMAIL_PROCESSED_LABEL=PM/Processed
```

The `GMAIL_FROM_ADDRESS` should match the mailbox you authorised. The label names should exist in Gmail (create them if needed) – the Gmail adapter uses these to separate new vs processed messages.

## 4. Verify access

Run `npm run dev`, log in to the app, and ensure the environment variables are loaded. When the Gmail adapter is executed later (e.g. by the ingestion job), it will use the refresh token to fetch access tokens transparently.

Add the production redirect URI and repeat the token exchange before deploying to production.
