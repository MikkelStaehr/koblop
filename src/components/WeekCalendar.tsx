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
import type {
  CalEvent,
  AvailabilityBand,
  EventTone,
} from "@/lib/queries/dashboard";

// Dæmpet kalender-stil: lys baggrund, farveaccent i venstre kant.
const TONE: Record<EventTone, string> = {
  blue: "bg-blue-50 text-blue-900 border-l-blue-500",
  green: "bg-emerald-50 text-emerald-900 border-l-emerald-500",
  amber: "bg-amber-50 text-amber-900 border-l-amber-500",
  slate: "bg-slate-50 text-slate-800 border-l-slate-400",
  violet: "bg-violet-50 text-violet-900 border-l-violet-500",
};

const ROW_H = 56; // px pr. time
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
  const now = new Date();

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

  // "Nu"-indikatoren — kun hvis i dag ligger i den viste uge og inden for tidsrum.
  const todayCol = mondayIndex(now);
  const inThisWeek =
    now >= weekStart && now < addDays(weekStart, 7);
  const nowFrac = dayFraction(now);
  const showNow = inThisWeek && nowFrac > 0 && nowFrac < 1;

  const gridH = (HOURS.length - 1) * ROW_H;

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="w-full min-w-[680px]">
        {/* Dag-overskrifter */}
        <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-neutral-200">
          <div />
          {DAY_LABELS.map((label, i) => {
            const date = addDays(weekStart, i);
            const isToday = date.toDateString() === now.toDateString();
            return (
              <div key={i} className="px-1 py-2.5 text-center">
                <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                  {label}
                </div>
                <div
                  className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                    isToday
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-700"
                  }`}
                >
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tids-grid */}
        <div className="grid grid-cols-[52px_repeat(7,1fr)]">
          {/* Tidskolonne */}
          <div className="relative" style={{ height: gridH }}>
            {HOURS.slice(0, -1).map((h, i) => (
              <div
                key={h}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-neutral-400"
                style={{ top: i * ROW_H }}
              >
                {h}:00
              </div>
            ))}
          </div>

          {/* Dagskolonner */}
          {DAY_LABELS.map((_, dayIdx) => {
            const dayEvents = eventsByDay[dayIdx] ?? [];
            const bands = bandsByDay[dayIdx] ?? [];
            const isToday = dayIdx === todayCol && inThisWeek;
            return (
              <div
                key={dayIdx}
                className={`relative border-l border-neutral-100 ${
                  isToday ? "bg-neutral-50/60" : ""
                }`}
                style={{ height: gridH }}
              >
                {/* Time-linjer */}
                {HOURS.slice(0, -1).map((h, i) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-neutral-100"
                    style={{ top: i * ROW_H }}
                  />
                ))}

                {/* Tilgængelighed */}
                {bands.map((b, i) => {
                  const top = hhmmFraction(b.start) * 100;
                  const bottom = hhmmFraction(b.end) * 100;
                  return (
                    <div
                      key={`av-${i}`}
                      className="absolute inset-x-1 rounded-md bg-blue-50/70"
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
                    7,
                  );
                  return (
                    <div
                      key={e.id}
                      className={`absolute inset-x-1 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-[11px] leading-tight shadow-sm ${TONE[e.tone]}`}
                      style={{ top: `${top}%`, height: `${height}%` }}
                      title={`${e.title} · ${fmtTime(start)}–${fmtTime(end)}`}
                    >
                      <div className="truncate font-semibold">{e.title}</div>
                      <div className="truncate opacity-70">
                        {fmtTime(start)}
                        {e.subtitle ? ` · ${e.subtitle}` : ""}
                      </div>
                    </div>
                  );
                })}

                {/* "Nu"-linje */}
                {isToday && showNow && (
                  <div
                    className="absolute inset-x-0 z-10"
                    style={{ top: `${nowFrac * 100}%` }}
                  >
                    <div className="relative border-t-2 border-red-500">
                      <div className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-red-500" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
