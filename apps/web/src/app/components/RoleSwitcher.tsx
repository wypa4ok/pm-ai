import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionRole } from "../../server/session/role";
import { ACTIVE_ROLE_COOKIE } from "../../server/session/role";

interface RoleSwitcherProps {
  roles: SessionRole[];
  activeRole: SessionRole;
}

export async function RoleSwitcher({ roles, activeRole }: RoleSwitcherProps) {
  if (!roles || roles.length < 2) {
    return null;
  }

  return (
    <form action={switchRoleAction} className="flex items-center gap-2">
      {roles.includes("OWNER") ? (
        <button
          type="submit"
          name="role"
          value="OWNER"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            activeRole === "OWNER"
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
          }`}
          disabled={activeRole === "OWNER"}
        >
          Landlord
        </button>
      ) : null}
      {roles.includes("TENANT") ? (
        <button
          type="submit"
          name="role"
          value="TENANT"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            activeRole === "TENANT"
              ? "border-green-500 bg-green-50 text-green-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-green-300"
          }`}
          disabled={activeRole === "TENANT"}
        >
          Tenant
        </button>
      ) : null}
    </form>
  );
}

async function switchRoleAction(formData: FormData) {
  "use server";

  const role = String(formData.get("role") ?? "");
  if (role !== "OWNER" && role !== "TENANT") {
    return;
  }

  const cookieStore = cookies();
  cookieStore.set({
    name: ACTIVE_ROLE_COOKIE,
    value: role,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(role === "TENANT" ? "/tenant" : "/tickets");
}
