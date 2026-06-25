"use client";

import { useMemo } from "react";
import {
  DAY_LABELS,
  CAL_START_HOUR,
  CAL_END_HOUR,
  addDays,
  dayFraction,
  mondayIndex,
  dbWeekdayToMonday,
  fmtTime,
} from "@/lib/dates";
import type { CalEvent, AvailabilityBand, EventTone } from "@/lib/queries/dashboard";

const TONE: Record<EventTone, string> = {
  blue: "bg-blue-500/90 text-white border-blue-600",
  green: "bg-emerald-500/90 text-white border-emerald-600",
  amber: "bg-amber-400/90 text-amber-950 border-amber-500",
  slate: "bg-slate-400/90 text-white border-slate-500",
};

const HOURS = Array.from(
  { length: CAL_END_HOUR - CAL_START_HOUR + 1 },
  (_, i) => CAL_START_HOUR + i,
);

export default function WeekCalendar({
  weekStartISO,
  events,
  availability = [],
}: {
  weekStartISO: string;
  events: CalEvent[];
  availability?: AvailabilityBand[];
}) {
  const weekStart = useMemo(() => new Date(weekStartISO), [weekStartISO]);
  const today = new Date();

  const bandsByDay = useMemo(() => {
    const map: Record<number, AvailabilityBand[]> = {};
    for (const b of availability) {
      const d = dbWeekdayToMonday(b.weekday);
      (map[d] ??= []).push(b);
    }
    return map;
  }, [availability]);

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalEvent[]> = {};
    for (const e of events) {
      const d = mondayIndex(new Date(e.start));
      (map[d] ??= []).push(e);
    }
    return map;
  }, [events]);

  function hhmmFraction(hhmm: string): number {
    const [h, m] = hhmm.split(":").map(Number);
    const mins = h * 60 + m;
    const start = CAL_START_HOUR * 60;
    const total = (CAL_END_HOUR - CAL_START_HOUR) * 60;
    return Math.max(0, Math.min(1, (mins - start) / total));
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <div className="w-full min-w-[640px]">
        {/* Dag-overskrifter */}
        <div className="grid grid-cols-[44px_repeat(7,1fr)] border-b border-neutral-200">
          <div />
          {DAY_LABELS.map((label, i) => {
            const date = addDays(weekStart, i);
            const isToday = date.toDateString() === today.toDateString();
            return (
              <div
                key={i}
                className={`px-1 py-2 text-center text-xs ${
                  isToday ? "font-semibold text-blue-600" : "text-neutral-500"
                }`}
              >
                <div>{label}</div>
                <div className="text-[13px]">{date.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* Tids-grid */}
        <div className="relative grid grid-cols-[44px_repeat(7,1fr)]">
          {/* Tidskolonne */}
          <div className="relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="h-12 border-b border-neutral-100 pr-1 text-right text-[10px] text-neutral-400"
              >
                {h}:00
              </div>
            ))}
          </div>

          {/* Dagskolonner */}
          {DAY_LABELS.map((_, dayIdx) => {
            const dayEvents = eventsByDay[dayIdx] ?? [];
            const bands = bandsByDay[dayIdx] ?? [];
            return (
              <div
                key={dayIdx}
                className="relative border-l border-neutral-100"
                style={{ height: `${HOURS.length * 3}rem` }}
              >
                {/* Times-streger */}
                {HOURS.map((h) => (
                  <div key={h} className="h-12 border-b border-neutral-100" />
                ))}

                {/* Tilgængelighed (svag baggrund) */}
                {bands.map((b, i) => {
                  const top = hhmmFraction(b.start) * 100;
                  const bottom = hhmmFraction(b.end) * 100;
                  return (
                    <div
                      key={`av-${i}`}
                      className="absolute inset-x-0.5 rounded bg-blue-50"
                      style={{ top: `${top}%`, height: `${bottom - top}%` }}
                    />
                  );
                })}

                {/* Bookinger */}
                {dayEvents.map((e) => {
                  const start = new Date(e.start);
                  const end = new Date(e.end);
                  const top = dayFraction(start) * 100;
                  const height = Math.max(
                    (dayFraction(end) - dayFraction(start)) * 100,
                    6,
                  );
                  return (
                    <div
                      key={e.id}
                      className={`absolute inset-x-0.5 overflow-hidden rounded-md border px-1 py-0.5 text-[10px] leading-tight shadow-sm ${TONE[e.tone]}`}
                      style={{ top: `${top}%`, height: `${height}%` }}
                      title={`${e.title} ${fmtTime(start)}–${fmtTime(end)}`}
                    >
                      <div className="font-medium">{fmtTime(start)}</div>
                      <div className="truncate font-semibold">{e.title}</div>
                      {e.subtitle && (
                        <div className="truncate opacity-90">{e.subtitle}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
