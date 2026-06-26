"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAttendance } from "@/lib/actions/classes";
import { LESSON_STATUS_LABEL } from "@/lib/domain";
import type { SessionAttendance } from "@/lib/queries/classes";

export default function AttendanceList({
  session,
}: {
  session: SessionAttendance;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(enrollmentId: string, present: boolean) {
    setBusyId(enrollmentId);
    setError(null);
    startTransition(async () => {
      const r = await setAttendance({
        sessionId: session.sessionId,
        classId: session.classId,
        enrollmentId,
        moduleId: session.moduleId,
        lessonNo: session.lessonNo,
        present,
      });
      if (r.ok) router.refresh();
      else setError(r.error ?? "Noget gik galt.");
      setBusyId(null);
    });
  }

  if (session.rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
        Ingen elever på holdet — tilføj elever før du krydser fremmøde af.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
        {session.rows.map((r) => (
          <li
            key={r.enrollmentId}
            className="flex items-center gap-3 px-4 py-2.5"
          >
            <input
              type="checkbox"
              checked={r.present}
              disabled={pending}
              onChange={(e) => toggle(r.enrollmentId, e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            <span className="text-sm">{r.name}</span>
            <span className="ml-auto flex items-center gap-2">
              {busyId === r.enrollmentId && (
                <span className="text-xs text-neutral-400">…</span>
              )}
              {r.lessonStatus && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    r.lessonStatus === "godkendt"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {LESSON_STATUS_LABEL[r.lessonStatus]}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
