"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClass, addMember } from "@/lib/actions/classes";
import type { ActiveEnrollment } from "@/lib/queries/schedule";

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

const STEPS = ["Navn", "Teoriplan", "Elever"];

export default function ClassWizard({
  students,
}: {
  students: ActiveEnrollment[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [autoSessions, setAutoSessions] = useState(true);
  const [weekday, setWeekday] = useState(3);
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState(90);
  const [startDate, setStartDate] = useState(todayInput());
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }

  function create() {
    setError(null);
    startTransition(async () => {
      const r = await createClass(
        name,
        null,
        autoSessions
          ? { weekday, time, durationMin: duration, startDate }
          : undefined,
      );
      if (!r.ok || !r.id) {
        setError(r.error ?? "Kunne ikke oprette holdet.");
        return;
      }
      for (const eid of selected) await addMember(r.id, eid);
      router.push(`/hold/${r.id}`);
    });
  }

  const canNext = step !== 0 || name.trim().length > 0;

  return (
    <div>
      <Link
        href="/hold"
        className="text-sm text-neutral-500 transition hover:text-black"
      >
        ← Hold
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold">Opret hold</h1>

      {/* Trin-indikator */}
      <ol className="mb-6 mt-4 flex gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`flex items-center gap-2 rounded-full px-3 py-1 ${
              i === step
                ? "bg-neutral-900 text-white"
                : i < step
                  ? "bg-neutral-200 text-neutral-700"
                  : "bg-neutral-100 text-neutral-400"
            }`}
          >
            <span className="font-medium">{i + 1}</span> {s}
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        {step === 0 && (
          <label className="block">
            <span className="mb-1 block text-sm text-neutral-500">
              Navn på hold
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="fx “Hold Forår 2026”"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoSessions}
                onChange={(e) => setAutoSessions(e.target.checked)}
              />
              Opret faste teorigange automatisk (én pr. teorilektion, ugentligt)
            </label>
            {autoSessions && (
              <>
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
                    <span className="mb-1 block text-neutral-500">Tid</span>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 px-2 py-2"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-neutral-500">Min.</span>
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
                <p className="text-xs text-neutral-400">
                  Der oprettes 30 teorigange (én pr. teorilektion i kat. B) og de
                  vises automatisk i kalenderen.
                </p>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <span className="mb-2 block text-sm text-neutral-500">
              Tilmeld elever ({selected.length}) — kan også gøres senere
            </span>
            {students.length === 0 ? (
              <p className="text-sm text-neutral-400">Ingen aktive elever.</p>
            ) : (
              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-neutral-200 p-2">
                {students.map((s) => (
                  <label
                    key={s.enrollmentId}
                    className="flex items-center gap-2 text-sm"
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
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || pending}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm disabled:opacity-40"
          >
            Tilbage
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Næste
            </button>
          ) : (
            <button
              onClick={create}
              disabled={pending}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Opretter…" : "Opret hold"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
