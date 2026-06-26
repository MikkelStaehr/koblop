"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "@/lib/actions/classes";
import type { ModuleOption } from "@/lib/queries/classes";

export default function CreateSessionForm({
  classId,
  modules,
}: {
  classId: string;
  modules: ModuleOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [lessonNo, setLessonNo] = useState(1);
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState(90);
  const [topic, setTopic] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selected = modules.find((m) => m.id === moduleId);
  const lessonCount = selected?.theoryLessons ?? 1;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!moduleId) return setError("Vælg et modul.");
    if (!startsAt) return setError("Vælg tidspunkt.");
    startTransition(async () => {
      const r = await createSession({
        classId,
        moduleId,
        lessonNo,
        startsAt: new Date(startsAt).toISOString(),
        durationMin: duration,
        topic: topic || null,
      });
      if (r.ok) {
        setStartsAt("");
        setTopic("");
        router.refresh();
      } else {
        setError(r.error ?? "Kunne ikke oprette teorigangen.");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4"
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Modul
          <select
            value={moduleId}
            onChange={(e) => {
              setModuleId(e.target.value);
              setLessonNo(1);
            }}
            className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm text-black"
          >
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                Modul {m.order} · {m.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Teorilektion
          <select
            value={lessonNo}
            onChange={(e) => setLessonNo(Number(e.target.value))}
            className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm text-black"
          >
            {Array.from({ length: lessonCount }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Teori {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Tidspunkt
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm text-black"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Varighed (min)
          <input
            type="number"
            min={15}
            step={15}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-24 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm tabular-nums text-black"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs text-neutral-500">
        Emne (valgfrit)
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="fx “Vigepligt og kryds”"
          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm text-black"
        />
      </label>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Opretter…" : "Opret teorigang"}
        </button>
      </div>
    </form>
  );
}
