import { NextRequest } from "next/server";
import { errorResponse } from "../errors";
import { getSupabaseAdmin } from "../../auth/supabase-client";
import { getOrCreateUser } from "../../services/user-sync";
import { UserRole } from "@prisma/client";

export type AuthedRequest = NextRequest & {
  auth: {
    user: {
      id: string;
      email: string;
      fullName: string;
      role: UserRole;
      onboardingCompleted: boolean;
    };
    accessToken: string;
  };
};

export async function withAuth(
  request: NextRequest,
): Promise<AuthedRequest | Response> {
  // Try Bearer token first (for API clients)
  const bearer = request.headers.get("authorization");

  let token: string | null = null;

  if (bearer && bearer.toLowerCase().startsWith("bearer ")) {
    token = bearer.slice("bearer ".length).trim();
  } else {
    // Fallback to cookie-based auth (for browser clients)
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map(c => {
          const [key, ...values] = c.split("=");
          return [key, values.join("=")];
        })
      );
      token = cookies["sb-access-token"] || null;
    }
  }

  if (!token) {
    return errorResponse("unauthorized", "Missing authentication", 401);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return errorResponse("unauthorized", "Invalid or expired token", 401);
    }

    if (!data.user.email) {
      return errorResponse("unauthorized", "User email is required", 401);
    }

    // Sync user to database and get/create user record
    const dbUser = await getOrCreateUser({
      supabaseUserId: data.user.id,
      email: data.user.email,
      fullName: data.user.user_metadata?.name || data.user.user_metadata?.full_name,
    });

    const authed = request as AuthedRequest;
    authed.auth = {
      user: dbUser,
      accessToken: token,
    };
    return authed;
  } catch (err) {
    console.error("Auth middleware error", err);
    return errorResponse("unauthorized", "Auth check failed", 401);
  }
}
