"use client";

import { useMemo, type ReactNode } from "react";
import { startOfWeek, addDays, DAY_LABELS, fmtTime } from "@/lib/dates";
import type { CalEvent, EventTone } from "@/lib/queries/dashboard";

const CHIP: Record<EventTone, string> = {
  blue: "bg-blue-100 text-blue-800",
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  slate: "bg-slate-100 text-slate-700",
};

export default function MonthCalendar({
  monthStartISO,
  events,
  header,
  onContextDay,
  onContextEvent,
}: {
  monthStartISO: string;
  events: CalEvent[];
  header?: ReactNode;
  onContextDay?: (dateISO: string, e: React.MouseEvent) => void;
  onContextEvent?: (event: CalEvent, e: React.MouseEvent) => void;
}) {
  const monthStart = useMemo(() => new Date(monthStartISO), [monthStartISO]);
  const gridStart = useMemo(() => startOfWeek(monthStart), [monthStart]);
  const month = monthStart.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventsByDay = useMemo(() => {
    const m: Record<string, CalEvent[]> = {};
    for (const e of events) {
      const k = new Date(e.start).toDateString();
      (m[k] ??= []).push(e);
    }
    return m;
  }, [events]);

  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {header && (
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          {header}
        </div>
      )}
      <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50">
        {DAY_LABELS.map((l) => (
          <div
            key={l}
            className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500"
          >
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === month;
          const isToday = d.getTime() === today.getTime();
          const weekend = i % 7 >= 5;
          const dayEvents = eventsByDay[d.toDateString()] ?? [];
          const shown = dayEvents.slice(0, 3);
          const extra = dayEvents.length - shown.length;
          return (
            <div
              key={i}
              onContextMenu={(me) => onContextDay?.(d.toISOString(), me)}
              className={`min-h-[116px] border-b border-r border-neutral-100 p-1.5 ${
                onContextDay ? "cursor-context-menu" : ""
              } ${
                !inMonth
                  ? "bg-neutral-50/60"
                  : weekend
                    ? "bg-neutral-50/40"
                    : ""
              }`}
            >
              <div
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? "bg-neutral-900 font-semibold text-white"
                    : inMonth
                      ? "text-neutral-700"
                      : "text-neutral-400"
                }`}
              >
                {d.getDate()}
              </div>
              <div className="flex flex-col gap-1">
                {shown.map((ev) => (
                  <div
                    key={ev.id}
                    onContextMenu={(me) => onContextEvent?.(ev, me)}
                    className={`truncate rounded px-1.5 py-0.5 text-[11px] ${CHIP[ev.tone]}`}
                    title={`${fmtTime(new Date(ev.start))} · ${ev.title}`}
                  >
                    <span className="tabular-nums opacity-70">
                      {fmtTime(new Date(ev.start))}
                    </span>{" "}
                    {ev.title}
                  </div>
                ))}
                {extra > 0 && (
                  <div className="px-1.5 text-[11px] text-neutral-400">
                    +{extra} flere
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
