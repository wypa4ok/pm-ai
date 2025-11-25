import Link from "next/link";
import { prisma } from "../../../../../../src/server/db";
import TenancyTable from "../components/TenancyTable";

export default async function TenanciesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[]>;
}) {
  const unitId =
    typeof searchParams?.unitId === "string" ? searchParams.unitId : undefined;
  const activeOnly = searchParams?.active === "true";

  const where: any = {};

  if (unitId) {
    where.unitId = unitId;
  }

  if (activeOnly) {
    where.OR = [{ endDate: null }, { endDate: { gt: new Date() } }];
  }

  const [tenancies, units] = await Promise.all([
    prisma.tenancy.findMany({
      where,
      include: {
        unit: {
          select: {
            id: true,
            name: true,
            address1: true,
            city: true,
            state: true,
          },
        },
        members: {
          include: {
            tenant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            isPrimary: "desc",
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
      take: 50,
    }),
    prisma.unit.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  const serialized = tenancies.map((tenancy) => {
    const primaryMember = tenancy.members.find((m) => m.isPrimary);
    const isActive = !tenancy.endDate || tenancy.endDate > new Date();

    return {
      id: tenancy.id,
      unitName: tenancy.unit.name,
      unitAddress: `${tenancy.unit.address1}, ${tenancy.unit.city}, ${tenancy.unit.state}`,
      primaryTenant: primaryMember
        ? `${primaryMember.tenant.firstName} ${primaryMember.tenant.lastName}`
        : "No primary",
      memberCount: tenancy.members.length,
      startDate: tenancy.startDate.toISOString(),
      endDate: tenancy.endDate?.toISOString() ?? null,
      isActive,
      ticketCount: tenancy._count.tickets,
    };
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Lease management</p>
          <h1 className="text-2xl font-semibold text-slate-900">Tenancies</h1>
          <p className="text-sm text-slate-500">
            View and manage active and past tenant leases
          </p>
        </div>
        <Link
          href="/tenancies/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Tenancy
        </Link>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="grid gap-4 md:grid-cols-3" method="get">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Unit
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring"
              name="unitId"
              defaultValue={unitId ?? ""}
            >
              <option value="">All units</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Status
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring"
              name="active"
              defaultValue={activeOnly ? "true" : ""}
            >
              <option value="">All tenancies</option>
              <option value="true">Active only</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {serialized.length === 0 ? (
          <p className="text-sm text-slate-500">
            No tenancies match the current filters.
          </p>
        ) : (
          <TenancyTable tenancies={serialized} />
        )}
      </section>
    </div>
  );
}
