import { Check } from "lucide-react";
import { REQUIREMENT_TYPE_LABEL } from "@/lib/domain";
import type { StudentRequirement } from "@/lib/queries/dashboard";

export default function StudentRequirementsCard({
  requirements,
}: {
  requirements: StudentRequirement[];
}) {
  if (requirements.length === 0) return null;

  return (
    <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
      {requirements.map((r) => (
        <li key={r.title} className="flex items-center gap-3 px-4 py-2.5">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              r.completed
                ? "bg-emerald-500 text-white"
                : "border border-neutral-300"
            }`}
          >
            {r.completed && <Check className="h-3 w-3" strokeWidth={3} />}
          </span>
          <span className={`text-sm ${r.completed ? "text-neutral-400" : ""}`}>
            {r.title}
          </span>
          <span className="ml-auto text-xs text-neutral-400">
            {r.completed ? "Gennemført" : REQUIREMENT_TYPE_LABEL[r.type]}
          </span>
        </li>
      ))}
    </ul>
  );
}
