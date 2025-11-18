import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const NEXT_PUBLIC_PATH_AFTER_LOGIN = "/tickets";

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=Enter%20email%20and%20password");
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    redirect(
      "/login?error=Supabase%20env%20vars%20(SUPABASE_URL,%20SUPABASE_ANON_KEY)%20missing",
    );
  }

  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    },
  );

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.access_token || !result?.refresh_token) {
    const message =
      typeof result?.error_description === "string"
        ? result.error_description
        : "Invalid login. Please try again.";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  const cookieStore = cookies();
  const secure = process.env.NODE_ENV === "production";
  const accessTokenMaxAge = Number(result.expires_in ?? 3600);

  cookieStore.set({
    name: "sb-access-token",
    value: String(result.access_token),
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: accessTokenMaxAge,
  });

  cookieStore.set({
    name: "sb-refresh-token",
    value: String(result.refresh_token),
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(NEXT_PUBLIC_PATH_AFTER_LOGIN);
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[]>;
}) {
  const roleParam =
    typeof searchParams?.role === "string" && searchParams.role === "tenant"
      ? "tenant"
      : "landlord";
  const rawError =
    typeof searchParams?.error === "string" ? searchParams.error : undefined;
  const error =
    rawError && rawError.length > 0
      ? decodeURIComponent(rawError.replace(/\+/g, " "))
      : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-slate-800 bg-slate-900/60 p-10 shadow-xl backdrop-blur">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-white">Sign in</h1>
          <p className="text-sm text-slate-300">
            Choose a portal and sign in with your account.
          </p>
        </div>

        {error ? (
          <p className="rounded border border-red-600 bg-red-600/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <form action={loginAction} className="space-y-5">
          <fieldset className="grid grid-cols-2 gap-3 text-sm font-medium text-slate-200/80">
            <label className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2">
              <input
                type="radio"
                name="role"
                value="landlord"
                defaultChecked={roleParam === "landlord"}
              />
              Landlord
            </label>
            <label className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2">
              <input
                type="radio"
                name="role"
                value="tenant"
                defaultChecked={roleParam === "tenant"}
              />
              Tenant
            </label>
          </fieldset>

          <div className="space-y-2 text-left">
            <label className="block text-sm font-medium text-slate-200">
              Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="admin@example.com"
              autoComplete="email"
              required
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-slate-400 transition focus:border-slate-500 focus:ring"
            />
          </div>

          <div className="space-y-2 text-left">
            <label className="block text-sm font-medium text-slate-200">
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-slate-400 transition focus:border-slate-500 focus:ring"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
