export type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

/**
 * Fetches a Supabase user by access token.
 * This only fetches the user - does NOT include role detection.
 * For role detection, use getUserRoles from services/user-roles.ts
 */
export async function fetchSupabaseUser(
  accessToken: string,
): Promise<SupabaseAuthUser | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase env vars missing; cannot fetch user.");
    return null;
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as SupabaseAuthUser | { user?: SupabaseAuthUser };
    const user = "id" in payload ? payload : payload.user;
    return user ?? null;
  } catch (error) {
    console.error("Failed to fetch Supabase user", error);
    return null;
  }
}
