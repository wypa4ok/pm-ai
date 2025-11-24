/**
 * Ensure the default owner user exists in the database
 */

import { prisma } from "../src/server/db";

async function main() {
  const targetUserId = process.env.GMAIL_DEFAULT_OWNER_USER_ID;

  if (!targetUserId) {
    console.error("❌ GMAIL_DEFAULT_OWNER_USER_ID not set in .env");
    process.exit(1);
  }

  console.log(`\n🔍 Checking for user: ${targetUserId}\n`);

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (existingUser) {
    console.log("✅ User already exists:");
    console.log(`   ID: ${existingUser.id}`);
    console.log(`   Email: ${existingUser.email}`);
    console.log(`   Name: ${existingUser.fullName}`);
    console.log(`   Role: ${existingUser.role}`);
    console.log("\nNo action needed.\n");
    return;
  }

  // User doesn't exist - create it
  console.log("⚠️  User not found. Creating default owner user...\n");

  const gmailAddress = process.env.GMAIL_FROM_ADDRESS || "owner@example.com";

  const newUser = await prisma.user.create({
    data: {
      id: targetUserId,
      email: gmailAddress,
      fullName: "Property Owner",
      role: "OWNER",
    },
  });

  console.log("✅ User created successfully:");
  console.log(`   ID: ${newUser.id}`);
  console.log(`   Email: ${newUser.email}`);
  console.log(`   Name: ${newUser.fullName}`);
  console.log(`   Role: ${newUser.role}`);
  console.log("\nYou can now ingest Gmail messages.\n");
}

main()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
