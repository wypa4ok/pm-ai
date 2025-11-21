export default function TenantHomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-center text-slate-700">
      <h2 className="text-2xl font-semibold text-slate-900">
        Welcome to your tenant portal
      </h2>
      <p className="max-w-lg text-sm text-slate-600">
        This area will soon show your maintenance tickets, new request form, and profile
        details. For now, hold tight while we finish building it.
      </p>
    </div>
  );
}
