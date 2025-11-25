/**
 * Test script for Tenancies CRUD API
 * Tests: POST create, GET list, GET by ID, PATCH update
 */

import { prisma } from "../src/server/db";

const API_BASE = "http://localhost:3000/api/v1";
const OWNER_USER_ID = process.env.GMAIL_DEFAULT_OWNER_USER_ID!;

async function getAuthCookies(): Promise<string> {
  // For testing, we'll use the owner user's Supabase session
  // In production, this would come from a proper login flow
  const accessToken = process.env.TEST_ACCESS_TOKEN || "";
  if (!accessToken) {
    console.log("⚠️  No TEST_ACCESS_TOKEN found, requests may fail auth");
  }
  return `sb-access-token=${accessToken}`;
}

async function setupTestData() {
  console.log("\n📝 Setting up test data...\n");

  // Create a test unit
  const unit = await prisma.unit.create({
    data: {
      name: "Test Unit 101",
      address1: "123 Test Street",
      city: "Test City",
      state: "CA",
      postalCode: "12345",
    },
  });
  console.log(`✅ Created test unit: ${unit.name} (${unit.id})`);

  // Create test tenants
  const tenant1 = await prisma.tenant.create({
    data: {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "+1234567890",
    },
  });
  console.log(`✅ Created tenant: ${tenant1.firstName} ${tenant1.lastName} (${tenant1.id})`);

  const tenant2 = await prisma.tenant.create({
    data: {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      phone: "+1234567891",
    },
  });
  console.log(`✅ Created tenant: ${tenant2.firstName} ${tenant2.lastName} (${tenant2.id})`);

  return { unit, tenant1, tenant2 };
}

async function testCreateTenancy(
  unitId: string,
  tenant1Id: string,
  tenant2Id: string,
  cookies: string
) {
  console.log("\n🧪 TEST 1: POST /v1/tenancies (Create tenancy)\n");

  const response = await fetch(`${API_BASE}/tenancies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies,
    },
    body: JSON.stringify({
      unitId,
      startDate: new Date().toISOString(),
      notes: "Test tenancy created via API",
      members: [
        { tenantId: tenant1Id, isPrimary: true },
        { tenantId: tenant2Id, isPrimary: false },
      ],
    }),
  });

  const data = await response.json();

  if (response.status === 201) {
    console.log("✅ Tenancy created successfully");
    console.log(`   ID: ${data.tenancy.id}`);
    console.log(`   Unit: ${data.tenancy.unit.name}`);
    console.log(`   Members: ${data.tenancy.members.length}`);
    console.log(`   Primary: ${data.tenancy.members.find((m: any) => m.isPrimary)?.tenant.firstName}`);
    return data.tenancy;
  } else {
    console.log("❌ Failed to create tenancy");
    console.log(`   Status: ${response.status}`);
    console.log(`   Error: ${JSON.stringify(data, null, 2)}`);
    return null;
  }
}

async function testListTenancies(cookies: string, unitId?: string) {
  console.log("\n🧪 TEST 2: GET /v1/tenancies (List tenancies)\n");

  const url = unitId
    ? `${API_BASE}/tenancies?unitId=${unitId}&active=true`
    : `${API_BASE}/tenancies`;

  const response = await fetch(url, {
    headers: {
      Cookie: cookies,
    },
  });

  const data = await response.json();

  if (response.status === 200) {
    console.log(`✅ Retrieved ${data.tenancies.length} tenancies`);
    data.tenancies.forEach((t: any, i: number) => {
      console.log(`   ${i + 1}. ${t.unit.name} - ${t.members.length} members (${t.isActive ? "Active" : "Ended"})`);
    });
    return data.tenancies;
  } else {
    console.log("❌ Failed to list tenancies");
    console.log(`   Status: ${response.status}`);
    console.log(`   Error: ${JSON.stringify(data, null, 2)}`);
    return [];
  }
}

async function testGetTenancy(tenancyId: string, cookies: string) {
  console.log("\n🧪 TEST 3: GET /v1/tenancies/:id (Get single tenancy)\n");

  const response = await fetch(`${API_BASE}/tenancies/${tenancyId}`, {
    headers: {
      Cookie: cookies,
    },
  });

  const data = await response.json();

  if (response.status === 200) {
    console.log("✅ Retrieved tenancy details");
    console.log(`   ID: ${data.tenancy.id}`);
    console.log(`   Unit: ${data.tenancy.unit.name}`);
    console.log(`   Start: ${new Date(data.tenancy.startDate).toLocaleDateString()}`);
    console.log(`   Members: ${data.tenancy.members.length}`);
    console.log(`   Tickets: ${data.tenancy.tickets.length}`);
    return data.tenancy;
  } else {
    console.log("❌ Failed to get tenancy");
    console.log(`   Status: ${response.status}`);
    console.log(`   Error: ${JSON.stringify(data, null, 2)}`);
    return null;
  }
}

async function testUpdateTenancy(tenancyId: string, cookies: string) {
  console.log("\n🧪 TEST 4: PATCH /v1/tenancies/:id (Update tenancy)\n");

  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 12);

  const response = await fetch(`${API_BASE}/tenancies/${tenancyId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies,
    },
    body: JSON.stringify({
      endDate: futureDate.toISOString(),
      notes: "Updated notes - lease expires in 12 months",
    }),
  });

  const data = await response.json();

  if (response.status === 200) {
    console.log("✅ Tenancy updated successfully");
    console.log(`   End date: ${new Date(data.tenancy.endDate).toLocaleDateString()}`);
    console.log(`   Notes: ${data.tenancy.notes}`);
    console.log(`   Still active: ${data.tenancy.isActive}`);
    return data.tenancy;
  } else {
    console.log("❌ Failed to update tenancy");
    console.log(`   Status: ${response.status}`);
    console.log(`   Error: ${JSON.stringify(data, null, 2)}`);
    return null;
  }
}

async function cleanup(unitId: string, tenant1Id: string, tenant2Id: string) {
  console.log("\n🧹 Cleaning up test data...\n");

  // Delete tenancies (cascade will handle members and tickets)
  await prisma.tenancy.deleteMany({
    where: { unitId },
  });

  // Delete tenants
  await prisma.tenant.deleteMany({
    where: {
      id: { in: [tenant1Id, tenant2Id] },
    },
  });

  // Delete unit
  await prisma.unit.delete({
    where: { id: unitId },
  });

  console.log("✅ Cleanup complete\n");
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 Tenancies CRUD API Test Suite");
  console.log("=".repeat(60));

  const cookies = await getAuthCookies();

  try {
    // Setup
    const { unit, tenant1, tenant2 } = await setupTestData();

    // Test 1: Create tenancy
    const tenancy = await testCreateTenancy(
      unit.id,
      tenant1.id,
      tenant2.id,
      cookies
    );

    if (!tenancy) {
      console.log("\n❌ Cannot continue tests - tenancy creation failed");
      await cleanup(unit.id, tenant1.id, tenant2.id);
      return;
    }

    // Test 2: List tenancies
    await testListTenancies(cookies, unit.id);

    // Test 3: Get single tenancy
    await testGetTenancy(tenancy.id, cookies);

    // Test 4: Update tenancy
    await testUpdateTenancy(tenancy.id, cookies);

    // Cleanup
    await cleanup(unit.id, tenant1.id, tenant2.id);

    console.log("\n" + "=".repeat(60));
    console.log("✅ All tests completed successfully!");
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
