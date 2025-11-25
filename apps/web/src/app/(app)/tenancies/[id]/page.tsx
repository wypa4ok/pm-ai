import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../../../../../src/server/db";

export default async function TenancyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: params.id },
    include: {
      unit: {
        select: {
          id: true,
          name: true,
          address1: true,
          address2: true,
          city: true,
          state: true,
          postalCode: true,
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
              phone: true,
              userId: true,
            },
          },
        },
        orderBy: {
          isPrimary: "desc",
        },
      },
      tickets: {
        select: {
          id: true,
          subject: true,
          status: true,
          priority: true,
          category: true,
          openedAt: true,
        },
        orderBy: {
          openedAt: "desc",
        },
        take: 10,
      },
    },
  });

  if (!tenancy) {
    notFound();
  }

  const isActive = !tenancy.endDate || tenancy.endDate > new Date();
  const primaryMember = tenancy.members.find((m) => m.isPrimary);

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      {/* Header */}
      <div>
        <Link
          href="/tenancies"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to tenancies
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {tenancy.unit.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {tenancy.unit.address1}
              {tenancy.unit.address2 && `, ${tenancy.unit.address2}`}
              <br />
              {tenancy.unit.city}, {tenancy.unit.state} {tenancy.unit.postalCode}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
              isActive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {isActive ? "Active Tenancy" : "Ended"}
          </span>
        </div>
      </div>

      {/* Tenancy Details */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Tenancy Details</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-500">Start Date</dt>
            <dd className="mt-1 text-sm text-slate-900">
              {tenancy.startDate.toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">End Date</dt>
            <dd className="mt-1 text-sm text-slate-900">
              {tenancy.endDate ? tenancy.endDate.toLocaleDateString() : "Ongoing"}
            </dd>
          </div>
          {tenancy.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-500">Notes</dt>
              <dd className="mt-1 text-sm text-slate-700">{tenancy.notes}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Tenant Members */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Tenant Members</h2>
          <span className="text-sm text-slate-500">
            {tenancy.members.length} {tenancy.members.length === 1 ? "member" : "members"}
          </span>
        </div>
        <ul className="mt-4 divide-y divide-slate-100">
          {tenancy.members.map((member) => (
            <li key={member.id} className="py-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {member.tenant.firstName} {member.tenant.lastName}
                    </p>
                    {member.isPrimary && (
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Primary
                      </span>
                    )}
                    {member.tenant.userId && (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Portal Access
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-1">
                    {member.tenant.email && (
                      <p className="text-xs text-slate-500">
                        Email: {member.tenant.email}
                      </p>
                    )}
                    {member.tenant.phone && (
                      <p className="text-xs text-slate-500">
                        Phone: {member.tenant.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Associated Tickets */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Associated Tickets
          </h2>
          <span className="text-sm text-slate-500">
            {tenancy.tickets.length} {tenancy.tickets.length === 1 ? "ticket" : "tickets"}
          </span>
        </div>
        {tenancy.tickets.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No tickets associated with this tenancy yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {tenancy.tickets.map((ticket) => (
              <li key={ticket.id} className="py-3">
                <Link href={`/tickets/${ticket.id}`}>
                  <div className="flex items-start justify-between hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-900 hover:underline">
                        {ticket.subject}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 font-medium ${
                            ticket.status === "OPEN"
                              ? "bg-blue-50 text-blue-700"
                              : ticket.status === "RESOLVED"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {ticket.status}
                        </span>
                        <span>{ticket.category}</span>
                        <span>{new Date(ticket.openedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
