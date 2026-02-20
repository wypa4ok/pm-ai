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
        <p className="text-sm font-medium text-slate-500">Tenant management</p>
        <h1 className="text-2xl font-semibold text-slate-900">Invite tenants</h1>
        <p className="text-sm text-slate-500">
          Send portal invites and track pending acceptance.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <InviteForm units={units} />
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Recent tenants</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {tenants.map((tenant) => (
              <li key={tenant.id} className="py-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {tenant.firstName} {tenant.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{tenant.email ?? "Email missing"}</p>
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
      <span className="text-xs font-medium text-emerald-600">Linked</span>
    );
  }
  if (invite.claimedAt) {
    return (
      <span className="text-xs font-medium text-emerald-600">Accepted</span>
    );
  }
  const expired = invite.expiresAt < new Date();
  return (
    <span className={`text-xs font-medium ${expired ? "text-red-600" : "text-amber-600"}`}>
      {expired ? "Expired invite" : `Expires ${invite.expiresAt.toLocaleDateString()}`}
    </span>
  );
}

function InviteForm({ units }: { units: Array<{ id: string; name: string }> }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Send invite</h2>
      <form action={inviteTenantAction} className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-600">First name</label>
          <input
            name="firstName"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Last name</label>
          <input
            name="lastName"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Email</label>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Unit (optional)</label>
          <select
            name="unitId"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white"
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
