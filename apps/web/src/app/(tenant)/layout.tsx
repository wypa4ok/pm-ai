import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RoleSwitcher } from "../components/RoleSwitcher";
import {
  ACTIVE_ROLE_COOKIE,
  deriveRoles,
  fetchSupabaseUser,
  type SessionRole,
} from "../../server/session/role";

type SupabaseUser = {
  id: string;
  email?: string;
};

export default async function TenantGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireTenantSession();

  return (
    <section className="flex min-h-screen flex-col bg-white text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-300">Tenant Portal</p>
          <h1 className="text-xl font-semibold">Your Home Requests</h1>
        </div>
        <div className="flex flex-col items-end gap-1 text-right text-sm">
          <div className="flex items-center gap-3">
            <RoleSwitcher roles={session.user.roles} activeRole={session.activeRole} />
            <span className="rounded-full bg-emerald-200/30 px-2 py-0.5 text-xs font-semibold text-emerald-50">
              Tenant
            </span>
          </div>
          <span className="font-medium">{session.user.email ?? "Signed in"}</span>
          <span className="text-xs text-slate-300">Access limited to your tickets</span>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}

async function requireTenantSession(): Promise<{
  user: SupabaseUser & { roles: SessionRole[] };
  activeRole: SessionRole;
}> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const supabaseUser = await fetchSupabaseUser(accessToken);
  if (!supabaseUser) {
    cookieStore.delete("sb-access-token");
    cookieStore.delete("sb-refresh-token");
    redirect("/login?error=Session%20expired.%20Please%20sign%20in%20again.");
  }

  const roles = deriveRoles(supabaseUser);
  if (!roles.includes("TENANT")) {
    if (roles.includes("OWNER")) {
      ensureActiveRole("OWNER", roles, cookieStore);
      redirect("/tickets");
    }
    redirect("/login?error=Tenant%20access%20required");
  }

  const activeRole = ensureActiveRole("TENANT", roles, cookieStore);
  if (activeRole !== "TENANT") {
    redirect(activeRole === "OWNER" ? "/tickets" : "/");
  }

  return {
    user: { ...supabaseUser, roles },
    activeRole,
  };
}

function ensureActiveRole(
  preferred: SessionRole,
  roles: SessionRole[],
  cookieStore: ReturnType<typeof cookies>,
): SessionRole {
  const stored = cookieStore.get(ACTIVE_ROLE_COOKIE)?.value as SessionRole | undefined;
  if (stored && roles.includes(stored)) {
    return stored;
  }
  const nextRole = roles.includes(preferred)
    ? preferred
    : roles[0] ?? preferred;
  cookieStore.set({
    name: ACTIVE_ROLE_COOKIE,
    value: nextRole,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return nextRole;
}
