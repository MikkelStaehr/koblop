"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { setEnrollmentStatus, deleteStudent } from "@/lib/actions/students";
import type { EnrollmentStatus } from "@/lib/database.types";

export default function StudentAdmin({
  enrollmentId,
  status,
  studentName,
}: {
  enrollmentId: string;
  status: EnrollmentStatus;
  studentName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paused = status === "paused";

  function togglePause() {
    setError(null);
    startTransition(async () => {
      const r = await setEnrollmentStatus(
        enrollmentId,
        paused ? "active" : "paused",
      );
      if (r.ok) router.refresh();
      else setError(r.error ?? "Noget gik galt.");
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const r = await deleteStudent(enrollmentId);
      if (r.ok) router.push("/elever");
      else {
        setError(r.error ?? "Kunne ikke slette eleven.");
        setConfirmingDelete(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-neutral-600">
          Status:{" "}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              paused
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {paused ? "På pause" : "Aktiv"}
          </span>
        </span>
        <button
          onClick={togglePause}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm transition hover:bg-neutral-50 disabled:opacity-50"
        >
          {paused ? (
            <>
              <PlayCircle className="h-4 w-4" /> Genaktivér
            </>
          ) : (
            <>
              <PauseCircle className="h-4 w-4" /> Sæt på pause
            </>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-3">
        {confirmingDelete ? (
          <>
            <span className="text-sm text-red-700">
              Slet {studentName} permanent? Alt forløb, bookinger og
              holdmedlemskab fjernes.
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <button
                onClick={remove}
                disabled={pending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Sletter…" : "Slet"}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={pending}
                className="text-sm text-neutral-500 hover:text-neutral-700"
              >
                Fortryd
              </button>
            </span>
          </>
        ) : (
          <>
            <span className="text-sm text-neutral-500">
              Fjern eleven helt fra skolen.
            </span>
            <button
              onClick={() => setConfirmingDelete(true)}
              disabled={pending}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Slet elev
            </button>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
