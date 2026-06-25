import type { CalEvent } from "@/lib/queries/dashboard";
import { fmtTime } from "@/lib/dates";

function dayLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  const diff = Math.round((dd.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "I dag";
  if (diff === 1) return "I morgen";
  return dd.toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

// Kompakt agenda over de næste 7 dage til forsiden.
export default function Upcoming({ events }: { events: CalEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
        Ingen aftaler de næste 7 dage.
      </p>
    );
  }

  const groups: { key: string; label: string; items: CalEvent[] }[] = [];
  for (const e of events) {
    const key = new Date(e.start).toDateString();
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: dayLabel(new Date(e.start)), items: [] };
      groups.push(g);
    }
    g.items.push(e);
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {g.label}
          </div>
          <ul className="flex flex-col gap-1.5">
            {g.items.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3"
              >
                <div className="w-12 shrink-0 text-sm font-medium tabular-nums text-neutral-500">
                  {fmtTime(new Date(e.start))}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{e.title}</div>
                  {e.subtitle && (
                    <div className="truncate text-xs text-neutral-500">
                      {e.subtitle}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
