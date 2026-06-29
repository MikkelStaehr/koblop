import type { CalEvent } from "@/lib/queries/dashboard";
import { fmtTime } from "@/lib/dates";

const DOT: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  slate: "bg-slate-400",
};

// Sidepanel: alle bookinger i den viste måned.
export default function MonthBookings({ events }: { events: CalEvent[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-700">
        Månedens bookinger ({events.length})
      </h2>
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
