export type SessionRole = "OWNER" | "TENANT";

export const ACTIVE_ROLE_COOKIE = "sb-active-role";

export type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

export async function fetchSupabaseUser(
  accessToken: string,
): Promise<SupabaseAuthUser | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase env vars missing; cannot resolve roles.");
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

export function deriveRoles(user?: SupabaseAuthUser | null): SessionRole[] {
  if (!user) return ["OWNER"];

  // Check metadata for explicitly set roles
  const fromUser = extractRoles(user?.user_metadata);
  const fromApp = extractRoles(user?.app_metadata);
  const metadataRoles = [...new Set([...fromUser, ...fromApp])];

  // If roles are explicitly set in metadata, use those
  if (metadataRoles.length > 0) {
    return metadataRoles;
  }

  // Default to OWNER
  // Note: For actual role detection based on database relationships,
  // use the /api/v1/auth/roles endpoint which can access Prisma
  return ["OWNER"];
}

function extractRoles(
  metadata?: Record<string, unknown> | null,
): SessionRole[] {
  if (!metadata) return [];

  const rolesValue = (metadata.roles ??
    metadata.role ??
    metadata.defaultRole) as unknown;

  const normalized: SessionRole[] = [];

  if (Array.isArray(rolesValue)) {
    for (const value of rolesValue) {
      const role = normalizeRole(value);
      if (role) normalized.push(role);
    }
  } else {
    const role = normalizeRole(rolesValue);
    if (role) normalized.push(role);
  }

  return normalized;
}

function normalizeRole(value: unknown): SessionRole | null {
  if (typeof value !== "string") return null;
  const upper = value.toUpperCase();
  if (upper === "OWNER" || upper === "LANDLORD") return "OWNER";
  if (upper === "TENANT") return "TENANT";
  return null;
}

export function resolveActiveRole(
  roles: SessionRole[],
  preferred?: string | null,
): SessionRole {
  if (preferred && roles.includes(preferred.toUpperCase() as SessionRole)) {
    return preferred.toUpperCase() as SessionRole;
  }
  if (roles.includes("OWNER")) return "OWNER";
  if (roles.includes("TENANT")) return "TENANT";
  return roles[0] ?? "OWNER";
}
