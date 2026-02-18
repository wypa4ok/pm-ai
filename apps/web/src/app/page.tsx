export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchSupabaseUser, deriveRoles } from "../server/session/role";

export default async function RootPage() {
  const cookieStore = await cookies();
  const isAuthenticated = Boolean(cookieStore.get("sb-access-token")?.value);

  // If authenticated, redirect based on role
  if (isAuthenticated) {
    const accessToken = cookieStore.get("sb-access-token")?.value;
    if (accessToken) {
      const user = await fetchSupabaseUser(accessToken);
      if (user) {
        const roles = deriveRoles(user);
        // Redirect tenants to their portal
        if (roles.includes("TENANT") && !roles.includes("OWNER")) {
          redirect("/tenant");
        }
        // Redirect landlords to their home
        if (roles.includes("OWNER")) {
          redirect("/home");
        }
      }
    }
  }

  // Not authenticated - show login selection
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-center text-white">
      <h1 className="text-3xl font-semibold">Choose your portal</h1>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <a
          href="/login?role=landlord"
          className="flex h-32 w-64 flex-col justify-center gap-2 rounded-xl border border-slate-700 bg-white/10 px-6 text-left text-white transition hover:border-blue-300 hover:bg-white/20"
        >
          <span className="text-lg font-semibold">Landlord</span>
          <span className="text-sm text-slate-200/80">
            Manage you properties and tenants.
          </span>
        </a>
        <a
          href="/login?role=tenant"
          className="flex h-32 w-64 flex-col justify-center gap-2 rounded-xl border border-slate-700 bg-white/10 px-6 text-left text-white transition hover:border-blue-300 hover:bg-white/20"
        >
          <span className="text-lg font-semibold">Tenant</span>
          <span className="text-sm text-slate-200/80">
            Track yout maintenance requests and payments.
          </span>
        </a>
      </div>
    </main>
  );
}
