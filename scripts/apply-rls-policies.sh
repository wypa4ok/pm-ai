#!/bin/bash
# Script to apply RLS policies to Supabase database
# This script outputs the SQL that should be run in Supabase SQL Editor

set -e

echo "========================================="
echo "RLS Policies Setup Script"
echo "========================================="
echo ""
echo "This script will display the SQL commands needed to enable RLS."
echo "Copy and paste the output into your Supabase SQL Editor."
echo ""
echo "Prerequisites:"
echo "  - Supabase project set up"
echo "  - Database migrations applied (npx prisma migrate deploy)"
echo "  - Service role access to SQL Editor"
echo ""
echo "========================================="
echo ""

# Check if the RLS policies file exists
if [ ! -f "db/sql/rls_policies.sql" ]; then
    echo "ERROR: db/sql/rls_policies.sql not found!"
    echo "Please ensure you're running this from the project root directory."
    exit 1
fi

echo "Step 1: Apply these SQL commands in Supabase SQL Editor"
echo "========================================="
echo ""
cat db/sql/rls_policies.sql
echo ""
echo "========================================="
echo ""

echo "Step 2: Verify RLS is enabled by running this query:"
echo "========================================="
echo ""
cat <<'EOF'
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('tenants', 'tickets', 'messages');
EOF
echo ""
echo "========================================="
echo ""

echo "Step 3: List all policies to verify they were created:"
echo "========================================="
echo ""
cat <<'EOF'
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('tenants', 'tickets', 'messages')
ORDER BY tablename, policyname;
EOF
echo ""
echo "========================================="
echo ""

echo "Setup complete! Next steps:"
echo "  1. Run the SQL from Step 1 in Supabase SQL Editor"
echo "  2. Verify with queries from Step 2 and 3"
echo "  3. Follow docs/tenant-portal-testing.md for comprehensive tests"
echo ""
