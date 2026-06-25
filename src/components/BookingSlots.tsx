"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookSlot } from "@/lib/actions/booking";
import { fmtTime } from "@/lib/dates";
import type { BookDay } from "@/lib/queries/booking";

export default function BookingSlots({
  lessonId,
  days,
}: {
  lessonId: string;
  days: BookDay[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  function book(startISO: string) {
    setPicked(startISO);
    setMsg(null);
    startTransition(async () => {
      const r = await bookSlot(lessonId, startISO);
      if (r.ok) {
        setMsg({ ok: true, text: "Køretime booket ✓" });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error ?? "Noget gik galt." });
        setPicked(null);
      }
    });
  }

  if (days.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
        Ingen ledige tider i de næste 14 dage.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.ok
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}
      {days.map((d) => (
        <div key={d.dateISO}>
          <div className="mb-2 text-sm font-semibold capitalize">{d.label}</div>
          <div className="flex flex-wrap gap-2">
            {d.slots.map((s) => (
              <button
                key={s.startISO}
                disabled={pending}
                onClick={() => book(s.startISO)}
                className={`rounded-lg border px-3 py-2 text-sm tabular-nums transition disabled:opacity-50 ${
                  picked === s.startISO
                    ? "border-black bg-black text-white"
                    : "border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {fmtTime(new Date(s.startISO))}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
