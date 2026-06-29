"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import MonthCalendar from "@/components/MonthCalendar";
import ContextMenu, { type MenuItem } from "@/components/ContextMenu";
import ScheduleModal from "@/components/ScheduleModal";
import { cancelBooking } from "@/lib/actions/booking";
import type { CalEvent } from "@/lib/queries/dashboard";
import type { Schedulable } from "@/lib/queries/schedule";

// Højreklik-laget oven på måneds-kalenderen: planlæg / aflys.
export default function MonthCalendarInteractive({
  monthStartISO,
  events,
  header,
  students,
}: {
  monthStartISO: string;
  events: CalEvent[];
  header?: ReactNode;
  students: Schedulable[];
}) {
  const router = useRouter();
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    items: MenuItem[];
  } | null>(null);
  const [modalDate, setModalDate] = useState<string | null>(null);

  function clamp(x: number) {
    return Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 210);
  }

  function onContextDay(dateISO: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({
      x: clamp(e.clientX),
      y: e.clientY,
      items: [
        { label: "Planlæg køretime…", onClick: () => setModalDate(dateISO) },
      ],
    });
  }

  function onContextEvent(ev: CalEvent, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const items: MenuItem[] = [];
    if (ev.bookingId) {
      const id = ev.bookingId;
      items.push({
        label: "Aflys booking",
        danger: true,
        onClick: async () => {
          const r = await cancelBooking(id);
          if (r.ok) router.refresh();
          else alert(r.error ?? "Kunne ikke aflyse.");
        },
      });
      // Ombook = aflys og planlæg en ny tid med det samme.
      items.push({
        label: "Ombook…",
        onClick: async () => {
          const r = await cancelBooking(id);
          if (r.ok) {
            router.refresh();
            setModalDate(ev.start);
          } else alert(r.error ?? "Kunne ikke aflyse.");
        },
      });
    } else {
      items.push({
        label: "Planlæg køretime…",
        onClick: () => setModalDate(ev.start),
      });
    }
    setMenu({ x: clamp(e.clientX), y: e.clientY, items });
  }

  return (
    <>
      <MonthCalendar
        monthStartISO={monthStartISO}
        events={events}
        header={header}
        onContextDay={onContextDay}
        onContextEvent={onContextEvent}
      />
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.items}
          onClose={() => setMenu(null)}
        />
      )}
      {modalDate && (
        <ScheduleModal
          dateISO={modalDate}
          students={students}
          onClose={() => setModalDate(null)}
        />
      )}
    </>
  );
}
