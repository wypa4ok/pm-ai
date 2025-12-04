"use client";

import { useState } from "react";
import CreateTicketModal from "./CreateTicketModal";

interface CreateTicketButtonProps {
  tenancyId: string;
  unitId: string;
  tenantId: string | undefined;
  tenantUserId: string | undefined;
}

export default function CreateTicketButton({
  tenancyId,
  unitId,
  tenantId,
  tenantUserId,
}: CreateTicketButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        + Create Ticket
      </button>

      <CreateTicketModal
        tenancyId={tenancyId}
        unitId={unitId}
        tenantId={tenantId}
        tenantUserId={tenantUserId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
