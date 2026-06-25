import type { Notice } from "@/lib/queries/dashboard";

const TONE: Record<Notice["tone"], string> = {
  info: "border-blue-200 bg-blue-50",
  success: "border-emerald-200 bg-emerald-50",
  warning: "border-amber-200 bg-amber-50",
};

// Feed i toppen: påmindelser og beskeder (fra kørelærer/teorilærer).
export default function FeedBanner({ notices }: { notices: Notice[] }) {
  if (notices.length === 0) return null;
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {notices.map((n) => (
        <div
          key={n.id}
          className={`rounded-xl border p-3 ${TONE[n.tone]}`}
        >
          <div className="text-sm font-medium text-neutral-800">{n.title}</div>
          {n.body && (
            <div className="mt-0.5 text-xs text-neutral-600">{n.body}</div>
          )}
          {n.from && (
            <div className="mt-1 text-[11px] text-neutral-400">— {n.from}</div>
          )}
        </div>
      ))}
    </div>
  );
}
