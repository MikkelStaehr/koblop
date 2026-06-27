"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Car, Trash2 } from "lucide-react";
import {
  createResource,
  setResourceActive,
  deleteResource,
} from "@/lib/actions/school";

export interface ResourceItem {
  id: string;
  name: string;
  type: string;
  active: boolean;
}

export default function ResourcesManager({
  resources,
}: {
  resources: ResourceItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
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
    <div className="flex max-w-xl flex-col gap-3">
      {resources.length > 0 && (
        <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {resources.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
              <Car className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className={`text-sm ${r.active ? "" : "text-neutral-400"}`}>
                {r.name}
                {!r.active && (
                  <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                    Inaktiv
                  </span>
                )}
              </span>
              <span className="ml-auto flex items-center gap-3">
                <button
                  onClick={() => run(() => setResourceActive(r.id, !r.active))}
                  disabled={pending}
                  className="text-xs text-neutral-500 transition hover:text-black disabled:opacity-50"
                >
                  {r.active ? "Deaktivér" : "Aktivér"}
                </button>
                <button
                  onClick={() => run(() => deleteResource(r.id))}
                  disabled={pending}
                  className="text-neutral-400 transition hover:text-red-600 disabled:opacity-50"
                  aria-label="Slet"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Fx “Skolevogn 1 — VW Golf”"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => {
            if (!name.trim()) return;
            run(() => createResource(name, "car"));
            setName("");
          }}
          disabled={pending || !name.trim()}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          Tilføj
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
