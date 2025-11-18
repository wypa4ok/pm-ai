type TimelineItem = {
  id: string;
  title: string;
  timestamp?: string;
  description?: string;
  badge?: string;
};

interface TimelineProps {
  items: TimelineItem[];
}

export default function Timeline({ items }: TimelineProps) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
        No activity yet.
      </div>
    );
  }

  return (
    <ol className="relative space-y-6 border-l border-slate-200 pl-6">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span className="absolute -left-[11px] top-1.5 h-3 w-3 rounded-full bg-blue-500" />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {item.title}
              </p>
              {item.badge ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {item.badge}
                </span>
              ) : null}
            </div>
            {item.timestamp ? (
              <p className="text-xs text-slate-500">
                {new Date(item.timestamp).toLocaleString()}
              </p>
            ) : null}
            {item.description ? (
              <p className="text-sm text-slate-600">{item.description}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
