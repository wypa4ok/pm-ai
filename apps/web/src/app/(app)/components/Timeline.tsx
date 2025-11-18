type TimelineItem = {
  id: string;
  title: string;
  timestamp?: string;
  description?: string;
  badge?: string;
  attachments?: Array<{
    id?: string;
    filename: string;
    mimeType?: string;
    sizeInBytes?: number;
    url?: string;
  }>;
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
            {item.attachments?.length ? (
              <div className="mt-2 flex flex-wrap gap-3">
                {item.attachments.map((attachment) => (
                  <AttachmentBadge key={attachment.id ?? attachment.filename} attachment={attachment} />
                ))}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function AttachmentBadge({
  attachment,
}: {
  attachment: {
    id?: string;
    filename: string;
    mimeType?: string;
    sizeInBytes?: number;
    url?: string;
  };
}) {
  const isImage = attachment.mimeType?.startsWith("image/");
  const isPdf = attachment.mimeType === "application/pdf";

  if (isImage && attachment.url) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className="flex w-32 flex-col overflow-hidden rounded-md border border-slate-200 bg-slate-50 shadow-sm transition hover:shadow"
      >
        <img
          src={attachment.url}
          alt={attachment.filename}
          className="h-24 w-full object-cover"
        />
        <span className="truncate px-2 py-1 text-xs font-medium text-slate-700">
          {attachment.filename}
        </span>
      </a>
    );
  }

  return (
    <a
      href={attachment.url ?? "#"}
      target={attachment.url ? "_blank" : undefined}
      rel={attachment.url ? "noreferrer" : undefined}
      className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
    >
      <span>{isPdf ? "📄" : "📎"}</span>
      <span className="truncate max-w-[160px]">{attachment.filename}</span>
      {attachment.sizeInBytes ? (
        <span className="text-[11px] text-slate-500">({formatSize(attachment.sizeInBytes)})</span>
      ) : null}
    </a>
  );
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}
