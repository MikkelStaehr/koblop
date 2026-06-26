import { Clock, MapPin } from "lucide-react";
import type { AgendaItem } from "@/lib/queries/dashboard";
import { fmtTime } from "@/lib/dates";
import Avatar from "@/components/Avatar";
import CancelBookingButton from "@/components/CancelBookingButton";

const DOW = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];

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
                <Clock className="h-3.5 w-3.5" />
                <span className="tabular-nums">
                  {fmtTime(s)} – {fmtTime(e)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-400">
                <MapPin className="h-3.5 w-3.5" />
                {it.venueLabel}
              </div>
            </div>

            <div className="min-w-0 flex-1 truncate font-medium">{it.title}</div>

            <div className="flex">
              {it.people.map((p, i) => (
                <Avatar key={i} initials={p.initials} name={p.name} />
              ))}
            </div>

            {it.bookingId && (
              <div className="ml-2 shrink-0">
                <CancelBookingButton bookingId={it.bookingId} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
