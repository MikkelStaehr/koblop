"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteClass } from "@/lib/actions/classes";

export default function DeleteClassButton({
  classId,
  className,
}: {
  classId: string;
  className: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function onDelete() {
    setErr(null);
    startTransition(async () => {
      const r = await deleteClass(classId);
      if (r.ok) router.push("/hold");
      else {
        setErr(r.error ?? "Kunne ikke slette holdet.");
        setConfirm(false);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {confirm ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm text-neutral-500">
            Slet “{className}” og alle teorigange?
          </span>
          <button
            onClick={onDelete}
            disabled={pending}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Sletter…" : "Bekræft slet"}
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
          >
            Fortryd
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
        >
          Slet hold
        </button>
      )}
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
