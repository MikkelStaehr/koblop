"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "@/lib/actions/events";
import {
  EVENT_TYPE_LABEL,
  EVENT_DEFAULT_MIN,
  type EventTypeKey,
} from "@/lib/domain";
import type { ActiveEnrollment } from "@/lib/queries/schedule";

function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function EventModal({
  type,
  dateISO,
  students,
  onClose,
}: {
  type: EventTypeKey;
  dateISO: string;
  students: ActiveEnrollment[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const todayStr = toDateInput(new Date());
  const [date, setDate] = useState(() => {
    const c = toDateInput(new Date(dateISO));
    return c < todayStr ? todayStr : c;
  });
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(EVENT_DEFAULT_MIN[type]);
  const [location, setLocation] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }

  function confirm() {
    const startISO = new Date(`${date}T${time}:00`).toISOString();
    setMsg(null);
    startTransition(async () => {
      const r = await createEvent({
        type,
        startISO,
        durationMin: duration,
        location: location || undefined,
        enrollmentIds: selected,
      });
      if (r.ok) {
        router.refresh();
        onClose();
      } else {
        setMsg(r.error ?? "Noget gik galt.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">
          Planlæg {EVENT_TYPE_LABEL[type]}
        </h2>
        <div className="flex flex-col gap-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-neutral-500">Dato</span>
              <input
                type="date"
                value={date}
                min={todayStr}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-neutral-500">Tidspunkt</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-neutral-500">Varighed (min)</span>
              <input
                type="number"
                min={15}
                step={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-neutral-500">Sted</span>
              <input
                type="text"
                value={location}
                placeholder="fx Glatbanen, Vejle"
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              />
            </label>
          </div>

          <div>
            <span className="mb-1 block text-neutral-500">
              Tilmeld elever ({selected.length})
            </span>
            {students.length === 0 ? (
              <p className="text-neutral-400">Ingen aktive elever.</p>
            ) : (
              <div className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-lg border border-neutral-200 p-2">
                {students.map((s) => (
                  <label
                    key={s.enrollmentId}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(s.enrollmentId)}
                      onChange={() => toggle(s.enrollmentId)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {msg && <p className="text-red-600">{msg}</p>}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2"
            >
              Annullér
            </button>
            <button
              onClick={confirm}
              disabled={pending}
              className="rounded-lg bg-black px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {pending ? "Opretter…" : "Opret event"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
