interface TicketDetailPageProps {
  params: {
    id: string;
  };
}

export default function TicketDetailPage({
  params,
}: TicketDetailPageProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-slate-500">
      <h2 className="text-xl font-semibold text-slate-700">
        Ticket #{params.id}
      </h2>
      <p className="text-sm">
        Detailed timeline and conversation history will live here soon.
      </p>
    </div>
  );
}
