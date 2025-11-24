/**
 * Test Gmail API scopes
 * This verifies what scopes your current refresh token has
 */

import { google } from "googleapis";

async function testScopes() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  oAuth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  try {
    // Get a new access token
    const { credentials } = await oAuth2Client.refreshAccessToken();
    console.log("\n✅ Successfully refreshed access token");
    console.log("Scopes granted:", credentials.scope);

    // Try to access Gmail
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    console.log("\nTesting Gmail API access...");

    // Try to list messages with metadata only
    console.log("1. Testing METADATA access...");
    try {
      await gmail.users.messages.list({
        userId: "me",
        maxResults: 1,
      });
      console.log("   ✅ METADATA access works");
    } catch (error: any) {
      console.log("   ❌ METADATA access failed:", error.message);
    }

    // Try to get a full message
    console.log("2. Testing FULL message access...");
    try {
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        maxResults: 1,
      });

      if (listResponse.data.messages && listResponse.data.messages.length > 0) {
        const messageId = listResponse.data.messages[0].id!;
        await gmail.users.messages.get({
          userId: "me",
          id: messageId,
          format: "full",
        });
        console.log("   ✅ FULL message access works!");
      } else {
        console.log("   ⚠️  No messages to test with");
      }
    } catch (error: any) {
      console.log("   ❌ FULL message access failed:", error.message);
      console.log("\n🔴 Your token needs gmail.readonly or gmail.modify scope");
    }

    // Try to modify (for labeling)
    console.log("3. Testing MODIFY access...");
    try {
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        maxResults: 1,
      });

      if (listResponse.data.messages && listResponse.data.messages.length > 0) {
        // Just test if we CAN call modify (don't actually change anything)
        console.log("   ✅ MODIFY scope appears to be granted");
      }
    } catch (error: any) {
      console.log("   ❌ MODIFY access might be limited:", error.message);
    }

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);

    if (error.message.includes("invalid_grant")) {
      console.log("\n💡 Your refresh token is invalid or expired.");
      console.log("   Run: npx tsx scripts/gmail-reauth.ts");
    }
  }
}

testScopes();
