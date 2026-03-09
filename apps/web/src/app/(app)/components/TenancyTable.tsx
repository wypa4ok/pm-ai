"use client";
import Link from "next/link";

type TenancyRow = {
  id: string;
  unitName: string;
  unitAddress: string;
  primaryTenant: string;
  memberCount: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  ticketCount: number;
};

interface TenancyTableProps {
  tenancies: TenancyRow[];
}

export default function TenancyTable({ tenancies }: TenancyTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="text-xs uppercase text-text-secondary">
            <th className="py-3 pr-3 font-medium">Unit</th>
            <th className="py-3 pr-3 font-medium">Primary Tenant</th>
            <th className="py-3 pr-3 font-medium">Members</th>
            <th className="py-3 pr-3 font-medium">Start Date</th>
            <th className="py-3 pr-3 font-medium">End Date</th>
            <th className="py-3 pr-3 font-medium">Status</th>
            <th className="py-3 pr-3 font-medium">Tickets</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tenancies.map((tenancy) => (
            <tr key={tenancy.id} className="hover:bg-surface-raised">
              <td className="py-3 pr-3 align-top">
                <Link href={`/tenancies/${tenancy.id}`}>
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold text-text-primary hover:underline">
                      {tenancy.unitName}
                    </div>
                    <p className="text-xs text-text-secondary">{tenancy.unitAddress}</p>
                  </div>
                </Link>
              </td>
              <td className="py-3 pr-3">
                <span className="text-sm text-text-primary">{tenancy.primaryTenant}</span>
              </td>
              <td className="py-3 pr-3">
                <span className="text-sm text-text-primary">
                  {tenancy.memberCount} {tenancy.memberCount === 1 ? "tenant" : "tenants"}
                </span>
              </td>
              <td className="py-3 pr-3">
                <span className="text-sm text-text-secondary">
                  {new Date(tenancy.startDate).toLocaleDateString()}
                </span>
              </td>
              <td className="py-3 pr-3">
                <span className="text-sm text-text-secondary">
                  {tenancy.endDate
                    ? new Date(tenancy.endDate).toLocaleDateString()
                    : "Ongoing"}
                </span>
              </td>
              <td className="py-3 pr-3">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    tenancy.isActive
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-surface-raised text-text-secondary"
                  }`}
                >
                  {tenancy.isActive ? "Active" : "Ended"}
                </span>
              </td>
              <td className="py-3 pr-3">
                <span className="text-sm text-text-secondary">{tenancy.ticketCount}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
