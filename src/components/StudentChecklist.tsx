"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  toggleLesson,
  approveModule,
  reopenModule,
} from "@/lib/actions/progress";
import {
  LESSON_TYPE_LABEL,
  VENUE_LABEL,
  MODULE_STATUS_LABEL,
} from "@/lib/domain";
import type { StudentProgress, ChecklistModule } from "@/lib/queries/student";

const MODULE_BADGE: Record<string, string> = {
  laast: "bg-neutral-100 text-neutral-400",
  i_gang: "bg-blue-50 text-blue-700",
  afventer_godkendelse: "bg-amber-50 text-amber-700",
  gennemfoert: "bg-emerald-50 text-emerald-700",
};

export default function StudentChecklist({
  progress,
}: {
  progress: StudentProgress;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run(id: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusyId(id);
    setMsg(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error ?? "Noget gik galt." });
      }
      setBusyId(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {msg && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {msg.text}
        </p>
      )}
      {progress.modules.map((m) => (
        <ModuleCard
          key={m.progressId}
          m={m}
          enrollmentId={progress.enrollmentId}
          busyId={busyId}
          pending={pending}
          run={run}
        />
      ))}
    </div>
  );
}

function ModuleCard({
  m,
  enrollmentId,
  busyId,
  pending,
  run,
}: {
  m: ChecklistModule;
  enrollmentId: string;
  busyId: string | null;
  pending: boolean;
  run: (id: string, fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const locked = m.status === "laast";
  const completed = m.status === "gennemfoert";

  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white ${
        locked ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <div>
          <div className="text-xs font-medium text-neutral-400">
            Modul {m.order}
          </div>
          <div className="font-medium">{m.title}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">
            {m.approvedLessons}/{m.totalLessons} godkendt
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              MODULE_BADGE[m.status] ?? "bg-neutral-100 text-neutral-500"
            }`}
          >
            {MODULE_STATUS_LABEL[m.status]}
          </span>
        </div>
      </div>

      {!locked && (
        <>
          <ul className="divide-y divide-neutral-50">
            {m.lessons.map((l) => {
              const isDone = l.status === "godkendt";
              const busy = busyId === l.id;
              return (
                <li
                  key={l.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <input
                    type="checkbox"
                    checked={isDone}
                    disabled={pending}
                    onChange={(e) =>
                      run(l.id, () =>
                        toggleLesson(l.id, e.target.checked, enrollmentId),
                      )
                    }
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span
                    className={`text-sm ${
                      isDone ? "text-neutral-400 line-through" : ""
                    }`}
                  >
                    {LESSON_TYPE_LABEL[l.type]} {l.lessonNo}
                    <span className="ml-2 text-xs text-neutral-400">
                      {VENUE_LABEL[l.venue]}
                      {l.selvstudium ? " · selvstudium" : ""}
                    </span>
                  </span>
                  {busy && (
                    <span className="ml-auto text-xs text-neutral-400">…</span>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex justify-end border-t border-neutral-100 px-4 py-3">
            {completed ? (
              <button
                onClick={() =>
                  run(m.progressId, () =>
                    reopenModule(m.progressId, enrollmentId),
                  )
                }
                disabled={pending}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Genåbn modul
              </button>
            ) : (
              <button
                onClick={() =>
                  run(m.progressId, () =>
                    approveModule(m.progressId, enrollmentId),
                  )
                }
                disabled={pending}
                className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                Godkend modul
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
