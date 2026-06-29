"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getDaySlots, staffScheduleBooking } from "@/lib/actions/schedule";
import { fmtTime } from "@/lib/dates";
import type { Schedulable } from "@/lib/queries/schedule";

function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function ScheduleModal({
  dateISO,
  students,
  presetEnrollmentId,
  onClose,
}: {
  dateISO: string;
  students: Schedulable[];
  presetEnrollmentId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lessonId, setLessonId] = useState(
    () =>
      (presetEnrollmentId
        ? students.find((s) => s.enrollmentId === presetEnrollmentId)?.lessonId
        : undefined) ??
      students[0]?.lessonId ??
      "",
  );
  const todayStr = toDateInput(new Date());
  const [date, setDate] = useState(() => {
    const clicked = toDateInput(new Date(dateISO));
    return clicked < todayStr ? todayStr : clicked; // kan ikke booke i fortiden
  });
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingSlots(true);
    setSlot(null);
    const iso = new Date(`${date}T00:00:00`).toISOString();
    getDaySlots(iso).then((s) => {
      if (active) {
        setSlots(s);
        setLoadingSlots(false);
      }
    });
    return () => {
      active = false;
    };
  }, [date]);

  function confirm() {
    if (!lessonId || !slot) {
      setMsg("Vælg elev og tid.");
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const r = await staffScheduleBooking(lessonId, slot);
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
        <h2 className="mb-4 text-lg font-semibold">Planlæg køretime</h2>
        {students.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Ingen elever er klar til en køretime lige nu (teori mangler, eller
            alle køretimer i deres modul er booket).
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-500">Elev</span>
              <select
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              >
                {students.map((s) => (
                  <option key={s.lessonId} value={s.lessonId}>
                    {s.studentName} — {s.lessonLabel}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-neutral-500">Dato</span>
              <input
                type="date"
                value={date}
                min={todayStr}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              />
            </label>

            <div className="text-sm">
              <span className="mb-1 block text-neutral-500">Ledige tider</span>
              {loadingSlots ? (
                <p className="text-neutral-400">Henter…</p>
              ) : slots.length === 0 ? (
                <p className="text-neutral-400">
                  Ingen ledige tider denne dag.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlot(s)}
                      className={`rounded-lg border px-3 py-1.5 text-sm tabular-nums ${
                        slot === s
                          ? "border-black bg-black text-white"
                          : "border-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      {fmtTime(new Date(s))}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {msg && <p className="text-sm text-red-600">{msg}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
              >
                Annullér
              </button>
              <button
                onClick={confirm}
                disabled={pending || !slot}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {pending ? "Booker…" : "Book"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
