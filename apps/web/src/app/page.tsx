import { cookies } from "next/headers";

export default function HomePage() {
  const isAuthenticated = Boolean(cookies().get("sb-access-token")?.value);

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-center text-white">
        <h1 className="text-3xl font-semibold">Choose your portal</h1>
        <p className="max-w-xl text-base text-slate-200/80">
          Landlords manage the console; tenants view their unit and tickets.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="/login?role=landlord"
            className="flex h-32 w-64 flex-col justify-center gap-2 rounded-xl border border-slate-700 bg-white/10 px-6 text-left text-white transition hover:border-blue-300 hover:bg-white/20"
          >
            <span className="text-lg font-semibold">Landlord</span>
            <span className="text-sm text-slate-200/80">
              Access inbox, contractors, settings, and approvals.
            </span>
          </a>
          <a
            href="/login?role=tenant"
            className="flex h-32 w-64 flex-col justify-center gap-2 rounded-xl border border-slate-700 bg-white/10 px-6 text-left text-white transition hover:border-blue-300 hover:bg-white/20"
          >
            <span className="text-lg font-semibold">Tenant</span>
            <span className="text-sm text-slate-200/80">
              View your rental info and track your tickets.
            </span>
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-center text-white">
      <h1 className="text-3xl font-semibold">Rental Ops Console</h1>
      <p className="max-w-xl text-base text-slate-200/80">
        Welcome, Landlord. Jump into your workspace below.
      </p>

      <nav className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <a
          href="/tickets"
          className="rounded-md bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/20"
        >
          Tickets
        </a>
        <a
          href="/settings"
          className="rounded-md bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/20"
        >
          Settings
        </a>
        <a
          href="/contractors"
          className="rounded-md bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/20"
        >
          Contractors
        </a>
        <a
          href="/login"
          className="rounded-md bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/20"
        >
          Log out / Switch role
        </a>
      </nav>
    </main>
  );
}
