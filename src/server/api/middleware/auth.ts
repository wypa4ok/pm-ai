import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { errorResponse } from "../errors";

export type AuthedRequest = NextRequest & {
  auth: {
    user: {
      id: string;
      email?: string;
      [key: string]: unknown;
    };
    accessToken: string;
  };
};

let supabaseAdminClient:
  | ReturnType<typeof createClient>
  | null = null;

function getSupabaseAdmin() {
  if (supabaseAdminClient) return supabaseAdminClient;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for auth middleware.");
  }

  supabaseAdminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return supabaseAdminClient;
}

export async function withAuth(
  request: NextRequest,
): Promise<AuthedRequest | Response> {
  const bearer = request.headers.get("authorization");
  if (!bearer || !bearer.toLowerCase().startsWith("bearer ")) {
    return errorResponse("unauthorized", "Missing bearer token", 401);
  }

  const token = bearer.slice("bearer ".length).trim();
  if (!token) {
    return errorResponse("unauthorized", "Invalid bearer token", 401);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return errorResponse("unauthorized", "Invalid or expired token", 401);
    }

    const authed = request as AuthedRequest;
    authed.auth = {
      user: {
        id: data.user.id,
        email: data.user.email ?? undefined,
        ...(data.user.user_metadata ?? {}),
      },
      accessToken: token,
    };
    return authed;
  } catch (err) {
    console.error("Auth middleware error", err);
    return errorResponse("unauthorized", "Auth check failed", 401);
  }
}
