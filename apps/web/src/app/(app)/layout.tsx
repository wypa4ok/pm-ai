import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RoleSwitcher } from "../../components/RoleSwitcher";
import {
  ACTIVE_ROLE_COOKIE,
  deriveRoles,
  fetchSupabaseUser,
  type SessionRole,
} from "../../server/session/role";

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

async function requireOwnerSession(): Promise<{
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
  if (!roles.includes("OWNER")) {
    if (roles.includes("TENANT")) {
      setActiveRoleCookie("TENANT", cookieStore);
      redirect("/tenant");
    }
    redirect("/login?error=Owner%20access%20required");
  }

  const activeRole = ensureActiveRole("OWNER", roles, cookieStore);
  if (activeRole !== "OWNER") {
    redirect(activeRole === "TENANT" ? "/tenant" : "/");
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
  setActiveRoleCookie(nextRole, cookieStore);
  return nextRole;
}

function setActiveRoleCookie(
  role: SessionRole,
  cookieStore: ReturnType<typeof cookies>,
) {
  cookieStore.set({
    name: ACTIVE_ROLE_COOKIE,
    value: role,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireOwnerSession();

  return (
    <section className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Rental Ops Console</p>
          <h1 className="text-xl font-semibold text-slate-900">
            Property Management Workspace
          </h1>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-600">
          <nav className="flex items-center gap-4">
            <Link href="/tickets" className="hover:text-slate-900">
              Tickets
            </Link>
            <Link href="/contractors" className="hover:text-slate-900">
              Contractors
            </Link>
            <Link href="/settings" className="hover:text-slate-900">
              Settings
            </Link>
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
          </nav>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-3">
              <RoleSwitcher roles={session.user.roles} activeRole={session.activeRole} />
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                Landlord
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {session.user.email ?? "Signed in"}
            </p>
            <p className="text-xs text-slate-400">Supabase Account</p>
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}
