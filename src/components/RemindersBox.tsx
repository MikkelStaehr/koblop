import type { Notice } from "@/lib/queries/dashboard";

const DOT: Record<Notice["tone"], string> = {
  info: "bg-blue-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
};

export default function RemindersBox({ notices }: { notices: Notice[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-700">Påmindelser</h2>
      {notices.length === 0 ? (
        <p className="text-sm text-neutral-400">Ingen påmindelser lige nu.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notices.map((n) => (
            <li key={n.id} className="flex gap-2.5">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[n.tone]}`}
              />
              <div className="min-w-0">
                <div className="text-sm text-neutral-800">{n.title}</div>
                {n.body && (
                  <div className="text-xs capitalize text-neutral-400">
                    {n.body}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
