"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAvailability, type WeekInput } from "@/lib/actions/availability";
import { DAY_LABELS_LONG } from "@/lib/dates";

export default function AvailabilityEditor({ week }: { week: WeekInput }) {
  const router = useRouter();
  const [days, setDays] = useState<WeekInput>(week);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function patch(i: number, p: Partial<WeekInput[number]>) {
    setDays((prev) => prev.map((d, j) => (j === i ? { ...d, ...p } : d)));
    setMsg(null);
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const r = await saveAvailability(days);
      if (r.ok) {
        setMsg({ ok: true, text: "Tilgængelighed gemt ✓" });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error ?? "Noget gik galt." });
      }
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {days.map((d, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <label className="flex w-36 shrink-0 cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={d.enabled}
                onChange={(e) => patch(i, { enabled: e.target.checked })}
                className="h-4 w-4 accent-black"
              />
              <span
                className={`text-sm font-medium ${
                  d.enabled ? "" : "text-neutral-400"
                }`}
              >
                {DAY_LABELS_LONG[i]}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={d.start}
                disabled={!d.enabled}
                onChange={(e) => patch(i, { start: e.target.value })}
                className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm tabular-nums disabled:opacity-40"
              />
              <span className="text-neutral-400">–</span>
              <input
                type="time"
                value={d.end}
                disabled={!d.enabled}
                onChange={(e) => patch(i, { end: e.target.value })}
                className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm tabular-nums disabled:opacity-40"
              />
            </div>
          </div>
        ))}
      </div>

      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div>
        <button
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Gemmer…" : "Gem tilgængelighed"}
        </button>
      </div>
    </div>
  );
}
