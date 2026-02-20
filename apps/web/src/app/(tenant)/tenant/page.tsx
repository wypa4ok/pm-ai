export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function logoutAction() {
  "use server";

  const cookieStore = await cookies();

  // Clear all session cookies
  cookieStore.delete("sb-access-token");
  cookieStore.delete("sb-refresh-token");
  cookieStore.delete("active_role");

  redirect("/");
}

export default function TenantHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-center text-white">
      <h1 className="text-3xl font-semibold">Tenant Portal</h1>
      <p className="max-w-xl text-base text-slate-200/80">
        Welcome. Jump into your workspace below.
      </p>

      <nav className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <a
          href="/tenant/tickets"
          className="rounded-md bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/20"
        >
          Tickets
        </a>
        <a
          href="/tenant/profile"
          className="rounded-md bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/20"
        >
          Profile
        </a>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md bg-red-500/20 px-4 py-2 font-medium text-white hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 transition"
          >
            Log Out
          </button>
        </form>
      </nav>
    </main>
  );
}
