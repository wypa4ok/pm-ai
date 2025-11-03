import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

async function requireSession(): Promise<SupabaseUser> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    redirect(
      "/login?error=Supabase%20env%20vars%20(SUPABASE_URL,%20SUPABASE_ANON_KEY)%20missing",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
  } catch (error) {
    console.error("Supabase auth check failed", error);
    redirect("/login?error=Unable%20to%20reach%20Supabase.%20Please%20retry.");
  }

  if (!response.ok) {
    cookieStore.delete("sb-access-token");
    cookieStore.delete("sb-refresh-token");
    redirect("/login?error=Session%20expired.%20Please%20sign%20in%20again.");
  }

  const user = (await response.json()) as SupabaseUser | { user?: SupabaseUser };
  const normalized =
    "id" in user ? (user as SupabaseUser) : ((user as { user?: SupabaseUser }).user ?? null);

  if (!normalized || !normalized.id) {
    redirect("/login?error=Unable%20to%20load%20session");
  }

  return normalized;
}

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireSession();

  return (
    <section className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Rental Ops Console</p>
          <h1 className="text-xl font-semibold text-slate-900">
            Property Management Workspace
          </h1>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p className="font-medium text-slate-700">
            {user.email ?? "Signed in"}
          </p>
          <p className="text-xs text-slate-400">Supabase Admin</p>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}
