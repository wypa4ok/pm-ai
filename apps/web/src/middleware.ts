import { NextResponse, type NextRequest } from "next/server";
import {
  ACTIVE_ROLE_COOKIE,
  deriveRoles,
  fetchSupabaseUser,
  type SessionRole,
} from "./server/session/role";
import { prisma } from "~/server/db";

const OWNER_HOME = "/home";
const TENANT_HOME = "/tenant";
const LANDLORD_PATHS = ["/tickets", "/tenancies", "/contractors", "/settings", "/app", "/tenants", "/home"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("sb-access-token")?.value;
  if (!accessToken) {
    return NextResponse.next();
  }

  const user = await fetchSupabaseUser(accessToken);
  if (!user) {
    return NextResponse.next();
  }

  const roles = deriveRoles(user);
  const activeRole = resolveActiveRoleFromCookie(
    roles,
    request.cookies.get(ACTIVE_ROLE_COOKIE)?.value,
  );

  // Check if user has completed onboarding (OWNER role only)
  if (roles.includes("OWNER") && pathname !== "/onboarding") {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { onboardingCompleted: true },
      });

      if (dbUser && !dbUser.onboardingCompleted) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error("Onboarding check error:", error);
      // Continue without onboarding check on error
    }
  }

  // Allow "/" to be accessed directly - it has its own dashboard page
  if (pathname === "/app") {
    const url = request.nextUrl.clone();
    url.pathname = activeRole === "TENANT" ? TENANT_HOME : OWNER_HOME;
    return NextResponse.redirect(url);
  }

  if (isTenantPath(pathname) && !roles.includes("TENANT")) {
    const url = request.nextUrl.clone();
    url.pathname = OWNER_HOME;
    return NextResponse.redirect(url);
  }

  if (isLandlordPath(pathname) && !roles.includes("OWNER")) {
    const url = request.nextUrl.clone();
    url.pathname = TENANT_HOME;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

function resolveActiveRoleFromCookie(
  roles: SessionRole[],
  stored?: string,
): SessionRole {
  if (stored && roles.includes(stored as SessionRole)) {
    return stored as SessionRole;
  }
  if (roles.includes("OWNER")) return "OWNER";
  if (roles.includes("TENANT")) return "TENANT";
  return roles[0] ?? "OWNER";
}

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/invite/") ||
    pathname === "/onboarding"
  );
}

function isTenantPath(pathname: string) {
  return pathname === "/tenant" || pathname.startsWith("/tenant/");
}

function isLandlordPath(pathname: string) {
  // "/" is accessible to all roles (has its own dashboard page)
  if (pathname === "/") return false;
  return LANDLORD_PATHS.some(
    (segment) => pathname === segment || pathname.startsWith(`${segment}/`),
  );
}

export const config = {
  matcher: ["/((?!api|_next|static|.*\\..*).*)"],
};
