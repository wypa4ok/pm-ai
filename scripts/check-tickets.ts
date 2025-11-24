/**
 * Check tickets in the database
 */

import { prisma } from "../src/server/db";

async function main() {
  const tickets = await prisma.ticket.findMany({
    include: {
      messages: true,
      owner: {
        select: {
          email: true,
          fullName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  console.log(`\n📋 Found ${tickets.length} tickets in database:\n`);

  for (const ticket of tickets) {
    console.log(`Ticket: ${ticket.subject}`);
    console.log(`  ID: ${ticket.id}`);
    console.log(`  Status: ${ticket.status}`);
    console.log(`  Channel: ${ticket.channel}`);
    console.log(`  Owner: ${ticket.owner.fullName} (${ticket.owner.email})`);
    console.log(`  Messages: ${ticket.messages.length}`);
    console.log(`  Created: ${ticket.createdAt.toISOString()}`);
    console.log("");
  }
}

main()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
