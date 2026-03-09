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
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
        No activity yet.
      </div>
    );
  }

  return (
    <ol className="relative space-y-6 border-l border-border pl-6">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span className="absolute -left-[11px] top-1.5 h-3 w-3 rounded-full bg-accent" />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-primary">
                {item.title}
              </p>
              {item.badge ? (
                <span className="rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium text-text-secondary">
                  {item.badge}
                </span>
              ) : null}
            </div>
            {item.timestamp ? (
              <p className="text-xs text-text-secondary">
                {new Date(item.timestamp).toLocaleString()}
              </p>
            ) : null}
            {item.description ? (
              <p className="text-sm text-text-secondary">{item.description}</p>
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
        className="flex w-32 flex-col overflow-hidden rounded-md border border-border bg-surface-alt shadow-sm transition hover:shadow"
      >
        <img
          src={attachment.url}
          alt={attachment.filename}
          className="h-24 w-full object-cover"
        />
        <span className="truncate px-2 py-1 text-xs font-medium text-text-secondary">
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
      className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary shadow-sm"
    >
      <span>{isPdf ? "\ud83d\udcc4" : "\ud83d\udcce"}</span>
      <span className="truncate max-w-[160px]">{attachment.filename}</span>
      {attachment.sizeInBytes ? (
        <span className="text-[11px] text-text-secondary">({formatSize(attachment.sizeInBytes)})</span>
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
