export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../../../../../src/server/db";
import TenantMembersSection from "./components/TenantMembersSection";
import CreateTicketButton from "./components/CreateTicketButton";

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
      <div>
        <Link
          href="/tenancies"
          className="text-sm text-text-muted hover:text-text-secondary"
        >
          ← Back to tenancies
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              {tenancy.unit.name}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {tenancy.unit.address1}
              {tenancy.unit.address2 && `, ${tenancy.unit.address2}`}
              <br />
              {tenancy.unit.city}, {tenancy.unit.state} {tenancy.unit.postalCode}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
              isActive
                ? "bg-green-500/10 text-green-400"
                : "bg-surface-raised text-text-muted"
            }`}
          >
            {isActive ? "Active Tenancy" : "Ended"}
          </span>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-text-primary">Tenancy Details</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-text-muted">Start Date</dt>
            <dd className="mt-1 text-sm text-text-primary">
              {tenancy.startDate.toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-text-muted">End Date</dt>
            <dd className="mt-1 text-sm text-text-primary">
              {tenancy.endDate ? tenancy.endDate.toLocaleDateString() : "Ongoing"}
            </dd>
          </div>
          {tenancy.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-text-muted">Notes</dt>
              <dd className="mt-1 text-sm text-text-secondary">{tenancy.notes}</dd>
            </div>
          )}
        </dl>
      </section>

      <TenantMembersSection
        tenancyId={tenancy.id}
        members={tenancy.members}
      />

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            Associated Tickets
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-muted">
              {tenancy.tickets.length} {tenancy.tickets.length === 1 ? "ticket" : "tickets"}
            </span>
            <CreateTicketButton
              tenancyId={tenancy.id}
              unitId={tenancy.unit.id}
              tenantId={primaryMember?.tenant.id ?? undefined}
              tenantUserId={primaryMember?.tenant.userId ?? undefined}
            />
          </div>
        </div>
        {tenancy.tickets.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">
            No tickets associated with this tenancy yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {tenancy.tickets.map((ticket) => (
              <li key={ticket.id} className="py-3">
                <Link href={`/tickets/${ticket.id}`}>
                  <div className="flex items-start justify-between hover:bg-surface-raised rounded-md px-1">
                    <div>
                      <p className="text-sm font-medium text-text-primary hover:underline">
                        {ticket.subject}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 font-medium ${
                            ticket.status === "OPEN"
                              ? "bg-blue-500/10 text-blue-400"
                              : ticket.status === "RESOLVED"
                                ? "bg-green-500/10 text-green-400"
                                : "bg-surface-raised text-text-muted"
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
