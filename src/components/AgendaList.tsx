import type { AgendaItem } from "@/lib/queries/dashboard";
import { fmtTime } from "@/lib/dates";
import Avatar from "@/components/Avatar";

const DOW = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

// "Vertikal kalender": agenda over de næste 7 dage med dato-chip + deltagere.
export default function AgendaList({ items }: { items: AgendaItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
        Ingen aftaler de næste 7 dage.
      </p>
    );
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <ul className="flex flex-col gap-2">
      {items.map((it) => {
        const s = new Date(it.start);
        const e = new Date(it.end);
        const d = new Date(s);
        d.setHours(0, 0, 0, 0);
        const isToday = d.getTime() === today.getTime();
        return (
          <li
            key={it.id}
            className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-3"
          >
            <div className="flex w-11 shrink-0 flex-col items-center">
              <span
                className={`text-xs font-medium ${isToday ? "text-red-500" : "text-neutral-400"}`}
              >
                {DOW[s.getDay()]}
              </span>
              <span
                className={`text-2xl font-semibold leading-none ${isToday ? "text-red-500" : "text-neutral-800"}`}
              >
                {s.getDate()}
              </span>
            </div>

            <div className="h-9 w-px shrink-0 bg-neutral-200" />

            <div className="w-36 shrink-0">
              <div className="flex items-center gap-1.5 text-sm text-neutral-700">
                <ClockIcon />
                <span className="tabular-nums">
                  {fmtTime(s)} – {fmtTime(e)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-400">
                <PinIcon />
                {it.venueLabel}
              </div>
            </div>

            <div className="min-w-0 flex-1 truncate font-medium">{it.title}</div>

            <div className="flex">
              {it.people.map((p, i) => (
                <Avatar key={i} initials={p.initials} name={p.name} />
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
