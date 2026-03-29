export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchSupabaseUser } from "../../../../server/session/role";
import { prisma } from "../../../../../../../src/server/db";
import TenantProfileForm from "../components/TenantProfileForm";

export default async function TenantProfilePage() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const supabaseUser = await fetchSupabaseUser(accessToken);
  if (!supabaseUser) {
    redirect("/login");
  }

  // Fetch tenant data
  const tenant = await prisma.tenant.findUnique({
    where: {
      userId: supabaseUser.id,
    },
    include: {
      unit: true,
    },
  });

  if (!tenant) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="text-2xl font-semibold text-text-primary">Profile Not Found</h2>
        <p className="text-sm text-text-secondary">
          Your tenant profile could not be found. Please contact property management.
        </p>
      </div>
    );
  }

  const tenantData = {
    id: tenant.id,
    firstName: tenant.firstName,
    lastName: tenant.lastName,
    email: tenant.email,
    phone: tenant.phone,
    unit: tenant.unit
      ? {
          name: tenant.unit.name,
          address1: tenant.unit.address1,
          address2: tenant.unit.address2,
          city: tenant.unit.city,
          state: tenant.unit.state,
          postalCode: tenant.unit.postalCode,
        }
      : null,
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-text-muted">Account</p>
        <h1 className="text-2xl font-semibold text-text-primary">Profile</h1>
        <p className="text-sm text-text-secondary">
          View your account information and update your contact details.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Personal Information</h2>
          <TenantProfileForm tenant={tenantData} />
        </div>

        {tenantData.unit && (
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Unit Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase text-text-muted">Unit</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">
                  {tenantData.unit.name}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-text-muted">Address</p>
                <p className="mt-1 text-sm text-text-secondary">
                  {tenantData.unit.address1}
                  {tenantData.unit.address2 && (
                    <>
                      <br />
                      {tenantData.unit.address2}
                    </>
                  )}
                  <br />
                  {tenantData.unit.city}, {tenantData.unit.state} {tenantData.unit.postalCode}
                </p>
              </div>

              <div className="rounded-md border border-border bg-surface-alt px-4 py-3 text-xs text-text-muted">
                To update unit information, please contact property management.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
