"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleRequirement } from "@/lib/actions/progress";
import { REQUIREMENT_TYPE_LABEL } from "@/lib/domain";
import type { RequirementRow } from "@/lib/queries/student";

export default function RequirementsChecklist({
  enrollmentId,
  requirements,
}: {
  enrollmentId: string;
  requirements: RequirementRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (requirements.length === 0) return null;

  function toggle(id: string, completed: boolean) {
    setBusyId(id);
    setError(null);
    startTransition(async () => {
      const r = await toggleRequirement(id, completed, enrollmentId);
      if (r.ok) router.refresh();
      else setError(r.error ?? "Noget gik galt.");
      setBusyId(null);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
        {requirements.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
            <input
              type="checkbox"
              checked={r.completed}
              disabled={pending}
              onChange={(e) => toggle(r.id, e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            <span
              className={`text-sm ${
                r.completed ? "text-neutral-400 line-through" : ""
              }`}
            >
              {r.title}
            </span>
            <span className="ml-auto flex items-center gap-2">
              {busyId === r.id && (
                <span className="text-xs text-neutral-400">…</span>
              )}
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                {REQUIREMENT_TYPE_LABEL[r.type]}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
