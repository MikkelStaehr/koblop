"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSchool } from "@/lib/actions/school";

export default function SchoolSettingsForm({
  name: initialName,
  cancellationWindowHours,
}: {
  name: string;
  cancellationWindowHours: number;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [hours, setHours] = useState(cancellationWindowHours);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const r = await updateSchool({ name, cancellationWindowHours: hours });
      if (r.ok) {
        setMsg({ ok: true, text: "Gemt ✓" });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error ?? "Noget gik galt." });
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs text-neutral-500">
        Skolens navn
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-neutral-500">
        Afbudsfrist (timer før køretimen)
        <input
          type="number"
          min={0}
          max={168}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="w-32 rounded-lg border border-neutral-300 px-3 py-2 text-sm tabular-nums text-black"
        />
        <span className="text-xs text-neutral-400">
          Elever kan kun aflyse online tidligere end dette. Kørelæreren kan altid
          aflyse.
        </span>
      </label>

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
          type="submit"
          disabled={pending}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Gemmer…" : "Gem"}
        </button>
      </div>
    </form>
  );
}
