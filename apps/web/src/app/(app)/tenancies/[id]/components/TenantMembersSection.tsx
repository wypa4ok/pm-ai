"use client";

import { useState } from "react";
import AddTenantModal from "./AddTenantModal";

type TenantMember = {
  id: string;
  isPrimary: boolean;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    userId: string | null;
  };
};

interface TenantMembersSectionProps {
  tenancyId: string;
  members: TenantMember[];
}

export default function TenantMembersSection({
  tenancyId,
  members,
}: TenantMembersSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            Tenant Members
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-muted">
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-surface-deep hover:bg-accent-hover"
            >
              Add Tenant
            </button>
          </div>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {members.map((member) => (
            <li key={member.id} className="py-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">
                      {member.tenant.firstName} {member.tenant.lastName}
                    </p>
                    {member.isPrimary && (
                      <span className="inline-flex rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                        Primary
                      </span>
                    )}
                    {member.tenant.userId && (
                      <span className="inline-flex rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                        Portal Access
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-1">
                    {member.tenant.email && (
                      <p className="text-xs text-text-muted">
                        Email: {member.tenant.email}
                      </p>
                    )}
                    {member.tenant.phone && (
                      <p className="text-xs text-text-muted">
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

      <AddTenantModal
        tenancyId={tenancyId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
