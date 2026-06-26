"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMember, removeMember } from "@/lib/actions/classes";
import type { ClassMember } from "@/lib/queries/classes";

export default function ClassMembers({
  classId,
  members,
  assignable,
}: {
  classId: string;
  members: ClassMember[];
  assignable: ClassMember[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pick, setPick] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else setError(r.error ?? "Noget gik galt.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {members.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500">
          Ingen elever på holdet endnu.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {members.map((m) => (
            <li
              key={m.memberId}
              className="flex items-center justify-between gap-2 px-4 py-2.5"
            >
              <span className="text-sm">{m.name}</span>
              <button
                onClick={() => run(() => removeMember(m.memberId, classId))}
                disabled={pending}
                className="text-xs text-neutral-400 transition hover:text-red-600 disabled:opacity-50"
              >
                Fjern
              </button>
            </li>
          ))}
        </ul>
      )}

      {assignable.length > 0 && (
        <div className="flex gap-2">
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Tilføj elev…</option>
            {assignable.map((a) => (
              <option key={a.enrollmentId} value={a.enrollmentId}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (!pick) return;
              run(() => addMember(classId, pick));
              setPick("");
            }}
            disabled={pending || !pick}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            Tilføj
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
