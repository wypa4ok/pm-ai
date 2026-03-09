export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "../../../../../../src/server/db";
import { createTenantInvite } from "../../../../../../src/server/services/tenant-invite";
import {
  deriveRoles,
  fetchSupabaseUser,
} from "../../../server/session/role";

export default async function TenantsPage() {
  const [tenants, units] = await Promise.all([
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        unit: true,
        invites: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.unit.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <header>
        <p className="text-sm font-medium text-text-secondary">Tenant management</p>
        <h1 className="text-2xl font-semibold text-text-primary">Invite tenants</h1>
        <p className="text-sm text-text-secondary">
          Send portal invites and track pending acceptance.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <InviteForm units={units} />
        <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-text-primary">Recent tenants</h2>
          <ul className="mt-3 divide-y divide-border">
            {tenants.map((tenant) => (
              <li key={tenant.id} className="py-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-text-primary">
                      {tenant.firstName} {tenant.lastName}
                    </p>
                    <p className="text-xs text-text-secondary">{tenant.email ?? "Email missing"}</p>
                  </div>
                  <InviteBadge invite={tenant.invites[0]} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function InviteBadge({ invite }: { invite?: { expiresAt: Date; claimedAt: Date | null } }) {
  if (!invite) {
    return (
      <span className="text-xs font-medium text-emerald-400">Linked</span>
    );
  }
  if (invite.claimedAt) {
    return (
      <span className="text-xs font-medium text-emerald-400">Accepted</span>
    );
  }
  const expired = invite.expiresAt < new Date();
  return (
    <span className={`text-xs font-medium ${expired ? "text-red-400" : "text-amber-400"}`}>
      {expired ? "Expired invite" : `Expires ${invite.expiresAt.toLocaleDateString()}`}
    </span>
  );
}

function InviteForm({ units }: { units: Array<{ id: string; name: string }> }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-text-primary">Send invite</h2>
      <form action={inviteTenantAction} className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-text-secondary">First name</label>
          <input
            name="firstName"
            required
            className="mt-1 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Last name</label>
          <input
            name="lastName"
            required
            className="mt-1 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Email</label>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Unit (optional)</label>
          <select
            name="unitId"
            className="mt-1 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary"
            defaultValue=""
          >
            <option value="">Unassigned</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-surface-deep"
        >
          Send invite
        </button>
      </form>
    </section>
  );
}

async function inviteTenantAction(formData: FormData) {
  "use server";

  const cookieStore = cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;
  if (!accessToken) {
    redirect("/login");
  }

  const user = await fetchSupabaseUser(accessToken!);
  if (!user) {
    redirect("/login?error=Session%20expired.%20Please%20sign%20in%20again.");
  }

  const roles = deriveRoles(user);
  if (!roles.includes("OWNER")) {
    throw new Error("Only owners can invite tenants");
  }

  await createTenantInvite({
    ownerUserId: user.id,
    ownerEmail: user.email ?? undefined,
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    unitId: String(formData.get("unitId") ?? "") || undefined,
  });

  revalidatePath("/tenants");
}
