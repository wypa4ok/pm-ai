#!/bin/bash

# Simple manual test for Tenancies API
# This script creates test data and provides curl commands to test the API

API_BASE="http://localhost:3000/api/v1"

echo "=========================================="
echo "🧪 Tenancies API Manual Test"
echo "=========================================="
echo ""
echo "This script will help you test the tenancies API endpoints."
echo "You'll need to run these commands in your browser or with proper auth cookies."
echo ""

# Check if server is running
if ! curl -s -o /dev/null -w "%{http_code}" "$API_BASE/route" | grep -q "200"; then
    echo "⚠️  Make sure the Next.js server is running on http://localhost:3000"
    echo "   Run: cd apps/web && npm run dev"
    echo ""
fi

echo "📝 First, let's create some test data in the database..."
echo ""

# Create test data using Prisma
npx tsx << 'EOF'
import { prisma } from "./src/server/db";

async function setup() {
  const unit = await prisma.unit.create({
    data: {
      name: "Apartment 101",
      address1: "123 Main Street",
      city: "San Francisco",
      state: "CA",
      postalCode: "94102",
    },
  });

  const tenant1 = await prisma.tenant.create({
    data: {
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice@example.com",
      phone: "+14155551234",
    },
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      firstName: "Bob",
      lastName: "Williams",
      email: "bob@example.com",
      phone: "+14155551235",
    },
  });

  console.log("\n✅ Test data created:");
  console.log(`   Unit ID: ${unit.id}`);
  console.log(`   Tenant 1 ID: ${tenant1.id}`);
  console.log(`   Tenant 2 ID: ${tenant2.id}`);
  console.log("");
  console.log("🔑 Save these IDs for the API tests below:");
  console.log("");
  console.log(`export UNIT_ID="${unit.id}"`);
  console.log(`export TENANT1_ID="${tenant1.id}"`);
  console.log(`export TENANT2_ID="${tenant2.id}"`);
  console.log("");

  await prisma.$disconnect();
}

setup().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
EOF

echo ""
echo "=========================================="
echo "📚 API Test Commands"
echo "=========================================="
echo ""
echo "After setting the environment variables above, run these commands:"
echo ""
echo "1️⃣  Create a tenancy:"
echo ""
echo 'curl -X POST http://localhost:3000/api/v1/tenancies \\'
echo '  -H "Content-Type: application/json" \\'
echo '  -H "Cookie: sb-access-token=YOUR_TOKEN_HERE" \\'
echo '  -d "{"'
echo '    \"unitId\": \"$UNIT_ID\",'
echo '    \"startDate\": \"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'\",'
echo '    \"notes\": \"12-month lease starting today\",'
echo '    \"members\": ['
echo '      { \"tenantId\": \"$TENANT1_ID\", \"isPrimary\": true },'
echo '      { \"tenantId\": \"$TENANT2_ID\", \"isPrimary\": false }'
echo '    ]'
echo '  }"'
echo ""
echo "2️⃣  List all tenancies:"
echo ""
echo 'curl http://localhost:3000/api/v1/tenancies \\'
echo '  -H "Cookie: sb-access-token=YOUR_TOKEN_HERE"'
echo ""
echo "3️⃣  List active tenancies for a unit:"
echo ""
echo 'curl "http://localhost:3000/api/v1/tenancies?unitId=$UNIT_ID&active=true" \\'
echo '  -H "Cookie: sb-access-token=YOUR_TOKEN_HERE"'
echo ""
echo "4️⃣  Get a specific tenancy (save the ID from step 1):"
echo ""
echo 'curl http://localhost:3000/api/v1/tenancies/TENANCY_ID_HERE \\'
echo '  -H "Cookie: sb-access-token=YOUR_TOKEN_HERE"'
echo ""
echo "5️⃣  Update a tenancy (end the lease):"
echo ""
echo 'curl -X PATCH http://localhost:3000/api/v1/tenancies/TENANCY_ID_HERE \\'
echo '  -H "Content-Type: application/json" \\'
echo '  -H "Cookie: sb-access-token=YOUR_TOKEN_HERE" \\'
echo '  -d "{"'
echo '    \"endDate\": \"'$(date -u -v+1y +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "+1 year" +"%Y-%m-%dT%H:%M:%SZ")'\",'
echo '    \"notes\": \"Lease ends in 1 year\"'
echo '  }"'
echo ""
echo "=========================================="
echo "💡 Tips:"
echo "=========================================="
echo "- Get your auth token from browser DevTools > Application > Cookies"
echo "- Look for 'sb-access-token' cookie value"
echo "- All endpoints require OWNER role"
echo ""
