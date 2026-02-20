export const dynamic = "force-dynamic";

export default function LandlordHomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-white">Welcome to your Landlord Portal</h1>
        <p className="mt-2 text-base text-slate-200/80">
          Use the navigation menu above to manage your properties and tenants.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:max-w-6xl">
        <a
          href="/tickets"
          className="group flex flex-col gap-3 rounded-xl border border-slate-700 bg-white/10 p-6 shadow-sm transition hover:border-blue-400 hover:bg-white/20"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white group-hover:text-blue-300">
              Tickets
            </h2>
            <svg
              className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-sm text-slate-300">
            View and manage maintenance requests from your tenants.
          </p>
        </a>

        <a
          href="/tenancies"
          className="group flex flex-col gap-3 rounded-xl border border-slate-700 bg-white/10 p-6 shadow-sm transition hover:border-indigo-400 hover:bg-white/20"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white group-hover:text-indigo-300">
              Tenancies
            </h2>
            <svg
              className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-sm text-slate-300">
            Manage tenant leases, members, and rental periods.
          </p>
        </a>

        <a
          href="/tenants"
          className="group flex flex-col gap-3 rounded-xl border border-slate-700 bg-white/10 p-6 shadow-sm transition hover:border-emerald-400 hover:bg-white/20"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white group-hover:text-emerald-300">
              Tenants
            </h2>
            <svg
              className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-sm text-slate-300">
            Manage tenant information and send invitations.
          </p>
        </a>

        <a
          href="/contractors"
          className="group flex flex-col gap-3 rounded-xl border border-slate-700 bg-white/10 p-6 shadow-sm transition hover:border-purple-400 hover:bg-white/20"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white group-hover:text-purple-300">
              Contractors
            </h2>
            <svg
              className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-purple-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-sm text-slate-300">
            View and manage your contractor network.
          </p>
        </a>

        <a
          href="/settings"
          className="group flex flex-col gap-3 rounded-xl border border-slate-700 bg-white/10 p-6 shadow-sm transition hover:border-slate-400 hover:bg-white/20"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white group-hover:text-slate-200">
              Settings
            </h2>
            <svg
              className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-sm text-slate-300">
            Configure your account and preferences.
          </p>
        </a>
      </div>
    </div>
  );
}
