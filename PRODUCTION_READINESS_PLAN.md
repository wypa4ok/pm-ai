# Production Readiness Plan - Complete Implementation Guide

**Goal**: Make the system production-ready for onboarding 100 landlords with 1000+ properties and 2000-4000 tenants.

**Total Estimated Effort**: ~80 hours (2 weeks for 1 developer, 1 week for 2 developers)

---

## Overview of Critical Issues

This plan addresses **8 critical blockers** plus the **landlord registration flow**:

| Priority | Category | Effort | Blockers |
|----------|----------|--------|----------|
| **P0** | Landlord Registration Flow | 26h | No way to onboard landlords |
| **P0** | Data Isolation & Security | 15h | Cross-landlord data leakage |
| **P0** | Performance & Scale | 12h | N+1 queries, no pagination |
| **P0** | Bulk Operations | 10h | Cannot onboard tenants at scale |
| **P1** | Authorization | 8h | Missing ownership validation |
| **P1** | Infrastructure | 9h | Rate limiting, indexes |

---

## P0: CRITICAL PATH (Must Complete Before Launch)

### Phase 1: Database Foundation & Security (15 hours)

These fixes must be implemented **first** as they affect all subsequent work.

---

#### Task 1.1: Add Owner Filtering to All List Functions
**Severity**: CRITICAL - Currently landlords can see ALL data from ALL landlords
**Effort**: 3 hours
**Files**:
- `/Users/pavlo/pm-ai/src/server/services/unit-service.ts`
- `/Users/pavlo/pm-ai/src/server/services/tenancy-service.ts`
- `/Users/pavlo/pm-ai/src/server/services/ticket-service.ts`

**Current Broken Code**:
```typescript
// unit-service.ts:45-58
export async function listUnits(): Promise<UnitListItem[]> {
  const units = await prisma.unit.findMany({
    orderBy: { name: "asc" },
    // NO OWNER FILTERING!
  });
  return units;
}
```

**Fixed Implementation**:
```typescript
export interface ListUnitsFilters {
  ownerUserId?: string;
  limit?: number;
  offset?: number;
}

export async function listUnits(filters: ListUnitsFilters = {}): Promise<UnitListItem[]> {
  const where: Prisma.UnitWhereInput = {};

  // CRITICAL: Always filter by owner
  if (filters.ownerUserId) {
    where.ownerUserId = filters.ownerUserId;
  }

  const units = await prisma.unit.findMany({
    where,
    orderBy: { name: "asc" },
    take: filters.limit ?? 50,
    skip: filters.offset ?? 0,
    select: {
      id: true,
      name: true,
      address1: true,
      city: true,
      state: true,
      postalCode: true,
    },
  });

  return units;
}
```

**Similarly fix**:
- `listTenants(filters: { ownerUserId?: string })` in tenancy-service.ts
- `listTickets(filters: { ownerUserId?: string })` in ticket-service.ts

**Update API Routes**:
```typescript
// apps/web/src/app/api/v1/units/route.ts
export async function GET(request: NextRequest) {
  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  // CRITICAL: Pass authenticated user's ID
  const units = await listUnits({
    ownerUserId: authed.userId,  // From auth middleware
    limit: 50,
  });

  return NextResponse.json({ units });
}
```

**Acceptance Criteria**:
- [ ] All list functions accept `ownerUserId` parameter
- [ ] All API routes pass authenticated user ID
- [ ] Landlord A cannot see Landlord B's data
- [ ] Test with 2+ landlords in database

---

#### Task 1.2: Add ownerUserId to Tenant Model
**Severity**: CRITICAL - Tenants not associated with owners
**Effort**: 3 hours
**Files**:
- `/Users/pavlo/pm-ai/prisma/schema.prisma`
- `/Users/pavlo/pm-ai/src/server/services/tenant-invite.ts`

**Schema Changes**:
```prisma
model Tenant {
  id             String    @id @default(uuid()) @db.Uuid
  firstName      String    @map("first_name")
  lastName       String    @map("last_name")
  email          String    @unique
  phone          String?
  userId         String?   @map("user_id") @db.Uuid
  unitId         String?   @map("unit_id") @db.Uuid

  // NEW: Track which landlord owns this tenant
  ownerUserId    String    @map("owner_user_id") @db.Uuid

  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  user    User?  @relation("UserTenants", fields: [userId], references: [id], onDelete: SetNull)
  unit    Unit?  @relation(fields: [unitId], references: [id], onDelete: SetNull)
  owner   User   @relation("OwnerTenants", fields: [ownerUserId], references: [id], onDelete: Restrict)

  // ... existing relations

  @@index([email])
  @@index([userId])
  @@index([unitId])
  @@index([ownerUserId])  // NEW: Index for filtering by owner
  @@map("tenants")
}

model User {
  // ... existing fields

  // Update relations
  ownedUnits      Unit[]           @relation("UnitOwner")
  ownedTickets    Ticket[]         @relation("TicketOwner")
  ownedTenants    Tenant[]         @relation("OwnerTenants")  // NEW
  tenantProfiles  Tenant[]         @relation("UserTenants")

  // ... rest of model
}
```

**Migration Steps**:
1. Create migration: `npx prisma migrate dev --name add_tenant_owner_field`
2. The migration will fail on existing data without owner - need data migration
3. Create a data migration script to backfill `ownerUserId`:

**File**: `/Users/pavlo/pm-ai/scripts/migrate-tenant-owners.ts` (NEW)
```typescript
import { prisma } from "../src/server/db";

async function migrateTenantOwners() {
  console.log("Starting tenant owner migration...");

  // Get all tenants without ownerUserId
  const tenants = await prisma.tenant.findMany({
    where: { ownerUserId: null },
    include: { unit: true },
  });

  console.log(`Found ${tenants.length} tenants to migrate`);

  for (const tenant of tenants) {
    // If tenant has a unit, use the unit's owner
    if (tenant.unit?.ownerUserId) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { ownerUserId: tenant.unit.ownerUserId },
      });
      console.log(`✓ Migrated tenant ${tenant.id} to owner ${tenant.unit.ownerUserId}`);
    } else {
      // Fallback: Find owner via tickets
      const ticket = await prisma.ticket.findFirst({
        where: { tenantId: tenant.id },
        select: { ownerUserId: true },
      });

      if (ticket?.ownerUserId) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { ownerUserId: ticket.ownerUserId },
        });
        console.log(`✓ Migrated tenant ${tenant.id} to owner ${ticket.ownerUserId} (via ticket)`);
      } else {
        console.warn(`⚠ Could not find owner for tenant ${tenant.id}`);
      }
    }
  }

  console.log("Migration complete!");
}

migrateTenantOwners()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Update Tenant Creation**:
```typescript
// tenant-invite.ts
export async function createTenantInvite(input: CreateTenantInviteInput) {
  let tenant = await prisma.tenant.findFirst({
    where: {
      email,
      ownerUserId: input.ownerUserId,  // NEW: Scope by owner
    },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        unitId: input.unitId || null,
        ownerUserId: input.ownerUserId,  // NEW: Set owner
      },
    });
  }

  // ... rest of function
}
```

**Acceptance Criteria**:
- [ ] Migration runs successfully on existing data
- [ ] All existing tenants have `ownerUserId` set
- [ ] New tenants created with `ownerUserId`
- [ ] Can filter tenants by owner in queries

---

#### Task 1.3: Fix getUserRoles() Performance Nightmare
**Severity**: CRITICAL - N+1 query explosion
**Effort**: 4 hours
**File**: `/Users/pavlo/pm-ai/src/server/services/user-roles.ts`

**Current Broken Code** (lines 14-43):
```typescript
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const roles: UserRole[] = [];

  // Query 1
  const tenant = await prisma.tenant.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (tenant) {
    roles.push("TENANT");
  }

  // Query 2
  const ownerTicket = await prisma.ticket.findFirst({
    where: { ownerUserId: userId },
    select: { id: true },
  });

  if (ownerTicket) {
    roles.push("OWNER");
  }

  // Defaults to OWNER - DANGEROUS!
  if (roles.length === 0) {
    roles.push("OWNER");
  }
  return roles;
}
```

**Fixed Implementation with Caching**:
```typescript
import { LRUCache } from "lru-cache";

// Cache user roles for 5 minutes
const roleCache = new LRUCache<string, UserRole[]>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  // Check cache first
  const cached = roleCache.get(userId);
  if (cached) {
    return cached;
  }

  // Fetch user with role from database (SINGLE QUERY)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      tenantProfiles: { take: 1, select: { id: true } },
      ownedUnits: { take: 1, select: { id: true } },
    },
  });

  if (!user) {
    return [];
  }

  const roles: UserRole[] = [];

  // Use the role field from User model
  if (user.role === "ADMIN") {
    roles.push("ADMIN");
  }

  if (user.role === "OWNER" || user.ownedUnits.length > 0) {
    roles.push("OWNER");
  }

  if (user.tenantProfiles.length > 0) {
    roles.push("TENANT");
  }

  // Default to role from database
  if (roles.length === 0) {
    roles.push(user.role);
  }

  // Cache the result
  roleCache.set(userId, roles);

  return roles;
}

// Helper to invalidate cache when user role changes
export function invalidateUserRoleCache(userId: string) {
  roleCache.delete(userId);
}
```

**Install Dependency**:
```bash
npm install lru-cache
```

**Acceptance Criteria**:
- [ ] Only 1 database query per getUserRoles() call
- [ ] Results cached for 5 minutes
- [ ] Cache invalidated when user role changes
- [ ] Load test: 1000 concurrent requests complete in <2s

---

#### Task 1.4: Add Pagination to All List Endpoints
**Severity**: CRITICAL - Will timeout with 1000+ records
**Effort**: 3 hours
**Files**: All list endpoints in `apps/web/src/app/api/v1/`

**Standard Pagination Pattern**:
```typescript
// Example: apps/web/src/app/api/v1/units/route.ts
export async function GET(request: NextRequest) {
  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  // Enforce maximum limit
  const safeLimit = Math.min(limit, 100);

  const units = await listUnits({
    ownerUserId: authed.userId,
    limit: safeLimit,
    offset,
  });

  // Get total count for pagination metadata
  const total = await prisma.unit.count({
    where: { ownerUserId: authed.userId },
  });

  return NextResponse.json({
    units,
    pagination: {
      page,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasNext: offset + units.length < total,
      hasPrev: page > 1,
    },
  });
}
```

**Apply to All List Endpoints**:
- `/api/v1/units` (GET)
- `/api/v1/tenants` (GET)
- `/api/v1/tickets` (GET)
- `/api/v1/contractors` (GET)

**Acceptance Criteria**:
- [ ] All list endpoints support `?page=X&limit=Y` query params
- [ ] Default limit is 50, max limit is 100
- [ ] Response includes pagination metadata
- [ ] Frontend updated to handle pagination

---

#### Task 1.5: Add Owner Authorization Checks
**Severity**: CRITICAL - Landlord A can modify Landlord B's resources
**Effort**: 2 hours
**Files**: All mutation endpoints (POST/PUT/DELETE)

**Create Authorization Helper**:

**File**: `/Users/pavlo/pm-ai/src/server/services/authorization.ts` (NEW)
```typescript
import { prisma } from "../db";

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Verifies that the authenticated user owns the specified unit
 */
export async function authorizeUnitOwnership(
  userId: string,
  unitId: string,
): Promise<void> {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { ownerUserId: true },
  });

  if (!unit) {
    throw new AuthorizationError("Unit not found");
  }

  if (unit.ownerUserId !== userId) {
    throw new AuthorizationError("You do not own this unit");
  }
}

/**
 * Verifies that the authenticated user owns the specified tenant
 */
export async function authorizeTenantOwnership(
  userId: string,
  tenantId: string,
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { ownerUserId: true },
  });

  if (!tenant) {
    throw new AuthorizationError("Tenant not found");
  }

  if (tenant.ownerUserId !== userId) {
    throw new AuthorizationError("You do not own this tenant");
  }
}

/**
 * Verifies that the authenticated user owns the specified ticket
 */
export async function authorizeTicketOwnership(
  userId: string,
  ticketId: string,
): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { ownerUserId: true },
  });

  if (!ticket) {
    throw new AuthorizationError("Ticket not found");
  }

  if (ticket.ownerUserId !== userId) {
    throw new AuthorizationError("You do not own this ticket");
  }
}
```

**Apply to Tenant Invite Endpoint**:
```typescript
// apps/web/src/app/api/v1/tenants/invite/route.ts
import { authorizeUnitOwnership } from "../../../../../../src/server/services/authorization";

export async function POST(request: NextRequest) {
  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  const json = await request.json();
  const parsed = createTenantInviteSchema.safeParse(json);

  if (!parsed.success) {
    return errorResponse("invalid_request", "Validation failed", 400);
  }

  // NEW: Verify user owns the unit
  if (parsed.data.unitId) {
    try {
      await authorizeUnitOwnership(authed.userId, parsed.data.unitId);
    } catch (error) {
      return errorResponse("forbidden", "You do not own this unit", 403);
    }
  }

  const invite = await createTenantInvite({
    ownerUserId: authed.userId,
    unitId: parsed.data.unitId,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email,
  });

  return NextResponse.json(invite);
}
```

**Apply to ALL Mutation Endpoints**:
- `POST /api/v1/tickets` - verify unit ownership
- `PUT /api/v1/tickets/[id]` - verify ticket ownership
- `DELETE /api/v1/units/[id]` - verify unit ownership
- `PUT /api/v1/tenants/[id]` - verify tenant ownership

**Acceptance Criteria**:
- [ ] All mutation endpoints verify ownership
- [ ] Returns 403 Forbidden if user doesn't own resource
- [ ] Test: Landlord A cannot modify Landlord B's data

---

### Phase 2: Landlord Registration Flow (26 hours)

**See**: [LANDLORD_REGISTRATION_IMPLEMENTATION_PLAN.md](LANDLORD_REGISTRATION_IMPLEMENTATION_PLAN.md)

This is **P0 CRITICAL** - without this, you cannot onboard landlords.

**Quick Summary**:
1. Update Prisma User schema (onboardingCompleted, companyName) - 3h
2. Create user sync service - 4h
3. Create Supabase Auth webhook - 4h
4. Create landlord signup page - 4h
5. Create onboarding wizard + API - 5h
6. Add onboarding middleware - 3h
7. Update landing page - 3h

**Total**: 26 hours

---

### Phase 3: Bulk Operations for Scale (10 hours)

#### Task 3.1: Build Bulk Tenant Invite Endpoint
**Severity**: CRITICAL - Cannot onboard 2000+ tenants one-by-one
**Effort**: 8 hours
**File**: `/Users/pavlo/pm-ai/apps/web/src/app/api/v1/tenants/invite/bulk/route.ts` (NEW)

**Implementation**:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "../../../../../../../../../src/server/api/middleware/auth";
import { createTenantInvite } from "../../../../../../../../../src/server/services/tenant-invite";
import { authorizeUnitOwnership } from "../../../../../../../../../src/server/services/authorization";

const bulkInviteSchema = z.object({
  tenants: z.array(
    z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      unitId: z.string().uuid().optional(),
    })
  ).max(100), // Limit to 100 per request
});

export async function POST(request: NextRequest) {
  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  const json = await request.json();
  const parsed = bulkInviteSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const results = {
    success: [] as any[],
    failed: [] as any[],
  };

  // Process all invites
  for (const tenant of parsed.data.tenants) {
    try {
      // Verify ownership if unitId provided
      if (tenant.unitId) {
        await authorizeUnitOwnership(authed.userId, tenant.unitId);
      }

      const invite = await createTenantInvite({
        ownerUserId: authed.userId,
        ...tenant,
      });

      results.success.push({
        email: tenant.email,
        inviteId: invite.id,
      });
    } catch (error) {
      results.failed.push({
        email: tenant.email,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    total: parsed.data.tenants.length,
    successful: results.success.length,
    failed: results.failed.length,
    results,
  });
}
```

**CSV Import Frontend** (Optional but recommended):

**File**: `/Users/pavlo/pm-ai/apps/web/src/app/(app)/tenants/import/page.tsx` (NEW)
```typescript
"use client";

import { useState } from "react";
import { parse } from "papaparse";

export default function BulkTenantImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<any>(null);

  async function handleImport() {
    if (!file) return;

    setImporting(true);

    // Parse CSV
    parse(file, {
      header: true,
      complete: async (results) => {
        // Batch into chunks of 100
        const chunks = [];
        for (let i = 0; i < results.data.length; i += 100) {
          chunks.push(results.data.slice(i, i + 100));
        }

        const allResults = [];

        // Process each chunk
        for (const chunk of chunks) {
          const response = await fetch("/api/v1/tenants/invite/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tenants: chunk }),
          });

          const result = await response.json();
          allResults.push(result);
        }

        setResults(allResults);
        setImporting(false);
      },
    });
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Bulk Tenant Import</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Upload CSV File
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="border rounded px-3 py-2"
        />
      </div>

      <button
        onClick={handleImport}
        disabled={!file || importing}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {importing ? "Importing..." : "Import Tenants"}
      </button>

      {results && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Import Results</h2>
          {results.map((result: any, idx: number) => (
            <div key={idx} className="bg-gray-50 p-4 rounded mb-2">
              <p>Successful: {result.successful}</p>
              <p>Failed: {result.failed}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**CSV Template** (document in plan):
```csv
firstName,lastName,email,unitId
John,Doe,john@example.com,uuid-here
Jane,Smith,jane@example.com,uuid-here
```

**Acceptance Criteria**:
- [ ] Can import up to 100 tenants per request
- [ ] CSV upload UI functional
- [ ] Returns detailed success/failure results
- [ ] Emails sent asynchronously (doesn't block response)
- [ ] Test: Import 500 tenants completes in <5 minutes

---

#### Task 3.2: Add Bulk Property Import
**Effort**: 2 hours
**File**: `/Users/pavlo/pm-ai/apps/web/src/app/api/v1/units/import/route.ts` (NEW)

Similar pattern to bulk tenant import. Allow CSV upload with property details.

---

### Phase 4: Infrastructure & Performance (9 hours)

#### Task 4.1: Migrate to Redis Rate Limiting
**Severity**: CRITICAL for distributed deployment
**Effort**: 4 hours
**Files**:
- `/Users/pavlo/pm-ai/src/server/api/middleware/rate-limit.ts`

**Install Dependencies**:
```bash
npm install ioredis
npm install --save-dev @types/ioredis
```

**Implementation**:
```typescript
import Redis from "ioredis";
import { NextRequest, NextResponse } from "next/server";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const WINDOW_SIZE = 60; // 60 seconds
const MAX_REQUESTS = 60; // 60 requests per minute

export async function rateLimit(request: NextRequest): Promise<NextResponse | null> {
  const identifier = getIdentifier(request);
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - WINDOW_SIZE * 1000;

  try {
    // Use Redis sorted set for sliding window
    await redis.zremrangebyscore(key, 0, windowStart);
    const requestCount = await redis.zcard(key);

    if (requestCount >= MAX_REQUESTS) {
      const oldestRequest = await redis.zrange(key, 0, 0, "WITHSCORES");
      const resetTime = oldestRequest[1]
        ? parseInt(oldestRequest[1]) + WINDOW_SIZE * 1000
        : now + WINDOW_SIZE * 1000;

      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((resetTime - now) / 1000).toString(),
            "X-RateLimit-Limit": MAX_REQUESTS.toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, WINDOW_SIZE);

    return null;
  } catch (error) {
    console.error("Rate limit error:", error);
    // Fail open - allow request if Redis is down
    return null;
  }
}

function getIdentifier(request: NextRequest): string {
  // Use user ID if authenticated, otherwise IP
  const userId = request.headers.get("x-user-id");
  if (userId) return userId;

  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
```

**Environment Variable**:
```bash
# .env
REDIS_URL=redis://localhost:6379
# Or for production: redis://:password@host:port
```

**Acceptance Criteria**:
- [ ] Redis running locally for development
- [ ] Rate limits persisted across server restarts
- [ ] Works with multiple server instances
- [ ] Fails open if Redis unavailable

---

#### Task 4.2: Add Performance Indexes
**Effort**: 2 hours
**File**: `/Users/pavlo/pm-ai/prisma/schema.prisma`

**Add Missing Composite Indexes**:
```prisma
model Ticket {
  // ... existing fields

  @@index([ownerUserId, createdAt])  // NEW: For owner's ticket list sorted by date
  @@index([ownerUserId, status])     // NEW: For filtering by status
  @@index([unitId, status])           // NEW: For unit's active tickets
  @@index([tenantId, createdAt])      // NEW: For tenant's ticket history
}

model Tenancy {
  // ... existing fields

  @@index([unitId, startDate])        // NEW: For active tenancies
  @@index([startDate, endDate])       // NEW: For date range queries
}

model TenantInvite {
  // ... existing fields

  @@index([ownerUserId, claimedAt])   // NEW: For unclaimed invites
  @@index([email, claimedAt])         // NEW: For checking pending invites
}

model ContractorSearchResult {
  // ... existing fields

  @@index([ticketId, updatedAt])      // NEW: For cache invalidation
}
```

**Run Migration**:
```bash
npx prisma migrate dev --name add_performance_indexes
```

**Acceptance Criteria**:
- [ ] Migration runs successfully
- [ ] Query performance improved (test with EXPLAIN ANALYZE)
- [ ] No slow queries in logs under load

---

#### Task 4.3: Harden RLS Policies
**Effort**: 3 hours
**File**: `/Users/pavlo/pm-ai/db/sql/rls_policies.sql`

**Current Problem**:
```sql
-- Every policy starts with service_role bypass
auth.role() = 'service_role' OR owner_user_id = auth.uid()
```

**Improved Approach**:
```sql
-- Remove service_role bypass, use user-level isolation only
CREATE POLICY "owners_can_view_own_units"
  ON units
  FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "owners_can_insert_own_units"
  ON units
  FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "owners_can_update_own_units"
  ON units
  FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "owners_can_delete_own_units"
  ON units
  FOR DELETE
  USING (owner_user_id = auth.uid());
```

**For Prisma Queries** (using service role):
Configure Prisma to use auth-level connection instead of service role:

```typescript
// Use RLS-aware connection for user queries
export function getPrismaClientForUser(userId: string) {
  // Set Postgres session variable for RLS
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`,
            query(args),
          ]);
          return result;
        },
      },
    },
  });
}
```

**Acceptance Criteria**:
- [ ] RLS policies don't rely on service_role
- [ ] User-scoped Prisma client works correctly
- [ ] Test: Service role key leak doesn't compromise data

---

## P1: IMPORTANT IMPROVEMENTS (Should Complete Before Scale)

### Task 5.1: Email Queue System
**Effort**: 6 hours
**Why**: Prevent bulk invite from being blocked by slow email sends

**Use BullMQ**:
```bash
npm install bullmq
```

**Implementation**:
```typescript
// src/server/queues/email-queue.ts
import { Queue, Worker } from "bullmq";
import { sendTenantInviteEmail } from "../integrations/email";

const emailQueue = new Queue("emails", {
  connection: { host: "localhost", port: 6379 },
});

const emailWorker = new Worker(
  "emails",
  async (job) => {
    await sendTenantInviteEmail(job.data);
  },
  { connection: { host: "localhost", port: 6379 } }
);

export async function queueTenantInviteEmail(data: any) {
  await emailQueue.add("tenant-invite", data);
}
```

---

## Testing & Validation Checklist

### Load Testing Scenarios

**Test 1: Concurrent Landlords**
- [ ] 100 landlords logged in simultaneously
- [ ] Each viewing their property list (1000 total properties)
- [ ] Response time < 500ms for 95th percentile

**Test 2: Bulk Tenant Import**
- [ ] Import 500 tenants via CSV
- [ ] Completes in < 5 minutes
- [ ] All emails queued successfully

**Test 3: Tenant Portal Usage**
- [ ] 1000 concurrent tenant logins
- [ ] Each viewing their tickets
- [ ] Database CPU < 80%

**Test 4: Data Isolation**
- [ ] Create 2 landlords with 10 properties each
- [ ] Verify Landlord A cannot see Landlord B's data
- [ ] Test all CRUD operations

---

## Implementation Timeline

### Week 1: Critical Fixes (40 hours)
- **Days 1-2**: Phase 1 (Data isolation, pagination, auth)
- **Days 3-5**: Phase 2 (Landlord registration flow)

### Week 2: Scale & Infrastructure (40 hours)
- **Days 1-2**: Phase 3 (Bulk operations)
- **Days 3-4**: Phase 4 (Redis, indexes, RLS)
- **Day 5**: Testing & validation

---

## Success Criteria

The system is production-ready when:

1. ✅ **Security**: No cross-landlord data leakage
2. ✅ **Performance**: <500ms response time at 100 concurrent landlords
3. ✅ **Scale**: Can onboard 100 landlords with 1000 properties
4. ✅ **Efficiency**: Can bulk import 500 tenants in <5 minutes
5. ✅ **Registration**: Landlord can self-register and onboard
6. ✅ **Authorization**: All mutations verify ownership
7. ✅ **Infrastructure**: Rate limiting works with multiple servers

---

## Post-Launch Monitoring

**Key Metrics to Track**:
- Response time (p50, p95, p99)
- Database query time
- Redis hit rate
- Email queue depth
- Failed authentication attempts
- Rate limit violations

**Alerts to Set Up**:
- Response time > 1s for 5 minutes
- Error rate > 1% for 5 minutes
- Database CPU > 80% for 10 minutes
- Email queue depth > 1000

---

## Next Steps

1. Review this plan with your team
2. Set up development environment (Redis, updated Prisma)
3. Start with Phase 1, Task 1.1 (data isolation)
4. Test each task before moving to next
5. Load test after Phase 1 completion
6. Full integration test after all phases complete

**Questions? Clarifications needed?** Let me know which phase to start with!
