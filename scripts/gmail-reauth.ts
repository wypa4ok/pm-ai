/**
 * Gmail OAuth Re-authorization Script
 *
 * This script helps you generate a new refresh token with the correct Gmail scopes.
 * Run this once to get a new GMAIL_REFRESH_TOKEN for your .env file.
 */

import { google } from "googleapis";
import * as readline from "readline";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.labels",
];

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || "http://localhost:3000/api/integrations/gmail/oauth/callback";

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env");
    process.exit(1);
  }

  const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );

  // Generate authorization URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Force to get refresh token
  });

  console.log("\n📧 Gmail OAuth Re-authorization\n");
  console.log("Required scopes:");
  SCOPES.forEach((scope) => console.log(`  - ${scope}`));
  console.log("\n1. Visit this URL in your browser:\n");
  console.log(authUrl);
  console.log("\n2. Authorize the application");
  console.log("3. Copy the authorization code from the redirect URL\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter the authorization code: ", async (code) => {
    rl.close();

    try {
      const { tokens } = await oAuth2Client.getToken(code);

      if (!tokens.refresh_token) {
        console.error("\n❌ No refresh token received. Try revoking access at:");
        console.error("   https://myaccount.google.com/permissions");
        console.error("   Then run this script again.\n");
        process.exit(1);
      }

      console.log("\n✅ Success! Add this to your .env file:\n");
      console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
      console.log("Also received:");
      console.log(`  Access Token: ${tokens.access_token?.substring(0, 20)}...`);
      if (tokens.expiry_date) {
        console.log(`  Expires: ${new Date(tokens.expiry_date).toISOString()}`);
      }
      console.log("\n");
    } catch (error) {
      console.error("\n❌ Error getting tokens:", error);
      process.exit(1);
    }
  });
}

main();
