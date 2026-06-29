"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClass } from "@/lib/actions/classes";

function todayInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const WEEKDAYS = [
  { value: 1, label: "Mandag" },
  { value: 2, label: "Tirsdag" },
  { value: 3, label: "Onsdag" },
  { value: 4, label: "Torsdag" },
  { value: 5, label: "Fredag" },
  { value: 6, label: "Lørdag" },
  { value: 0, label: "Søndag" },
];

export default function CreateClassForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [autoSessions, setAutoSessions] = useState(true);
  const [weekday, setWeekday] = useState(3); // onsdag
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState(90);
  const [startDate, setStartDate] = useState(todayInput());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await createClass(
        name,
        null,
        autoSessions
          ? { weekday, time, durationMin: duration, startDate }
          : undefined,
      );
      if (r.ok && r.id) router.push(`/hold/${r.id}`);
      else setError(r.error ?? "Kunne ikke oprette holdet.");
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Navn på hold, fx “Hold Forår 2026”"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={autoSessions}
          onChange={(e) => setAutoSessions(e.target.checked)}
        />
        Opret faste teorigange automatisk (én pr. teorilektion, ugentligt)
      </label>

      {autoSessions && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-neutral-500">Ugedag</span>
            <select
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
              className="w-full rounded-lg border border-neutral-300 px-2 py-2"
            >
              {WEEKDAYS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-neutral-500">Tidspunkt</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-2 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-neutral-500">Varighed (min)</span>
            <input
              type="number"
              min={30}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-lg border border-neutral-300 px-2 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-neutral-500">Start</span>
            <input
              type="date"
              value={startDate}
              min={todayInput()}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-2 py-2"
            />
          </label>
        </div>
      )}

      {autoSessions && (
        <p className="text-xs text-neutral-400">
          Der oprettes 30 teorigange (én pr. teorilektion i kat. B) fra første{" "}
          {WEEKDAYS.find((w) => w.value === weekday)?.label.toLowerCase()} efter
          startdatoen — og de vises automatisk i kalenderen.
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Opretter…" : "Opret hold"}
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
