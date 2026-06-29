import type { CalEvent } from "@/lib/queries/dashboard";
import { fmtTime } from "@/lib/dates";

const DOT: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  slate: "bg-slate-400",
  violet: "bg-violet-500",
};

const LABEL_PILL: Record<string, string> = {
  Vej: "bg-blue-100 text-blue-700",
  Manøvrebane: "bg-amber-100 text-amber-700",
  Glatbane: "bg-violet-100 text-violet-700",
  Teori: "bg-emerald-100 text-emerald-700",
};

// Sidepanel: alle bookinger i den viste måned.
export default function MonthBookings({ events }: { events: CalEvent[] }) {
  const counts: Record<string, number> = {};
  for (const e of events) {
    const k = e.subtitle ?? "Andet";
    counts[k] = (counts[k] ?? 0) + 1;
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">
          {events.length}
        </span>
        <h2 className="text-sm font-semibold text-neutral-700">
          bookinger denne måned
        </h2>
      </div>
      {events.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {Object.entries(counts).map(([label, n]) => (
            <span
              key={label}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                LABEL_PILL[label] ?? "bg-neutral-100 text-neutral-600"
              }`}
            >
              {n} {label}
            </span>
          ))}
        </div>
      )}
      {events.length === 0 ? (
        <p className="text-sm text-neutral-400">Ingen bookinger denne måned.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e) => {
            const s = new Date(e.start);
            return (
              <li key={e.id} className="flex gap-3">
                <div className="w-10 shrink-0 text-center">
                  <div className="text-[11px] uppercase text-neutral-400">
                    {s.toLocaleDateString("da-DK", { weekday: "short" })}
                  </div>
                  <div className="text-base font-semibold leading-none">
                    {s.getDate()}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${DOT[e.tone]}`}
                    />
                    <span className="text-sm tabular-nums text-neutral-500">
                      {fmtTime(s)}
                    </span>
                  </div>
                  <div className="truncate text-sm font-medium">{e.title}</div>
                  {e.subtitle && (
                    <div className="truncate text-xs text-neutral-400">
                      {e.subtitle}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
