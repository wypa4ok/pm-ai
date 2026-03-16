/**
 * Reset database to a clean state, keeping only the admin user.
 *
 * Run with:
 *   npx tsx scripts/reset-db.ts
 *
 * from the repo root.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const KEEP_EMAIL = "wupa4ok@gmail.com";

async function main() {
  console.log("Starting database reset...");
  console.log(`Keeping user: ${KEEP_EMAIL}\n`);

  // 1. Agent-related (deepest children first)
  const ap = await prisma.actionProposal.deleteMany();
  console.log(`Deleted ${ap.count} action proposals`);

  const acm = await prisma.agentConversationMessage.deleteMany();
  console.log(`Deleted ${acm.count} agent conversation messages`);

  const ac = await prisma.agentConversation.deleteMany();
  console.log(`Deleted ${ac.count} agent conversations`);

  // 2. Ticket children
  const ae = await prisma.agentEvent.deleteMany();
  console.log(`Deleted ${ae.count} agent events`);

  const csr = await prisma.contractorSearchResult.deleteMany();
  console.log(`Deleted ${csr.count} contractor search results`);

  const msg = await prisma.message.deleteMany();
  console.log(`Deleted ${msg.count} messages`);

  // 3. Tickets
  const tickets = await prisma.ticket.deleteMany();
  console.log(`Deleted ${tickets.count} tickets`);

  // 4. Tenancy tree
  const tm = await prisma.tenancyMember.deleteMany();
  console.log(`Deleted ${tm.count} tenancy members`);

  const ti = await prisma.tenantInvite.deleteMany();
  console.log(`Deleted ${ti.count} tenant invites`);

  const ten = await prisma.tenancy.deleteMany();
  console.log(`Deleted ${ten.count} tenancies`);

  const tenants = await prisma.tenant.deleteMany();
  console.log(`Deleted ${tenants.count} tenants`);

  // 5. Units and contractors
  const units = await prisma.unit.deleteMany();
  console.log(`Deleted ${units.count} units`);

  const contractors = await prisma.contractor.deleteMany();
  console.log(`Deleted ${contractors.count} contractors`);

  // 6. Users except the admin
  const users = await prisma.user.deleteMany({
    where: { email: { not: KEEP_EMAIL } },
  });
  console.log(`Deleted ${users.count} other users`);

  // Verify
  const remaining = await prisma.user.findMany({ select: { email: true, role: true } });
  console.log("\nRemaining users:", remaining);
  console.log("\nDatabase reset complete.");
}

main()
  .catch((e) => {
    console.error("Reset failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
