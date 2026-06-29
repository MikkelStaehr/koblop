"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import MonthCalendar from "@/components/MonthCalendar";
import ContextMenu, { type MenuItem } from "@/components/ContextMenu";
import ScheduleModal from "@/components/ScheduleModal";
import EventModal from "@/components/EventModal";
import { cancelBooking } from "@/lib/actions/booking";
import { deleteEvent } from "@/lib/actions/events";
import type { EventTypeKey } from "@/lib/domain";
import type { CalEvent } from "@/lib/queries/dashboard";
import type { Schedulable, ActiveEnrollment } from "@/lib/queries/schedule";

// Højreklik-laget oven på måneds-kalenderen: planlæg køretime/event, aflys, slet.
export default function MonthCalendarInteractive({
  monthStartISO,
  events,
  header,
  students,
  attendees,
}: {
  monthStartISO: string;
  events: CalEvent[];
  header?: ReactNode;
  students: Schedulable[];
  attendees: ActiveEnrollment[];
}) {
  const router = useRouter();
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    items: MenuItem[];
  } | null>(null);
  const [bookingDate, setBookingDate] = useState<string | null>(null);
  const [eventModal, setEventModal] = useState<{
    type: EventTypeKey;
    dateISO: string;
  } | null>(null);

  function clamp(x: number) {
    return Math.min(
      x,
      (typeof window !== "undefined" ? window.innerWidth : 9999) - 230,
    );
  }

  function onContextDay(dateISO: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({
      x: clamp(e.clientX),
      y: e.clientY,
      items: [
        { label: "Planlæg køretime…", onClick: () => setBookingDate(dateISO) },
        {
          label: "Manøvrebane…",
          onClick: () => setEventModal({ type: "manoevrebane", dateISO }),
        },
        {
          label: "Glatbane…",
          onClick: () => setEventModal({ type: "glatbane", dateISO }),
        },
        {
          label: "Førstehjælpskursus…",
          onClick: () => setEventModal({ type: "foerstehjaelp", dateISO }),
        },
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
      items.push({
        label: "Ombook…",
        onClick: async () => {
          const r = await cancelBooking(id);
          if (r.ok) {
            router.refresh();
            setBookingDate(ev.start);
          } else alert(r.error ?? "Kunne ikke aflyse.");
        },
      });
    } else if (ev.eventId) {
      const id = ev.eventId;
      items.push({
        label: "Slet event",
        danger: true,
        onClick: async () => {
          const r = await deleteEvent(id);
          if (r.ok) router.refresh();
          else alert(r.error ?? "Kunne ikke slette.");
        },
      });
    } else if (ev.sessionId && ev.classId) {
      const cid = ev.classId;
      items.push({
        label: "Gå til holdet",
        onClick: () => router.push(`/hold/${cid}`),
      });
    } else {
      items.push({
        label: "Planlæg køretime…",
        onClick: () => setBookingDate(ev.start),
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
      {bookingDate && (
        <ScheduleModal
          dateISO={bookingDate}
          students={students}
          onClose={() => setBookingDate(null)}
        />
      )}
      {eventModal && (
        <EventModal
          type={eventModal.type}
          dateISO={eventModal.dateISO}
          students={attendees}
          onClose={() => setEventModal(null)}
        />
      )}
    </>
  );
}
