import Link from "next/link";
import type { StudentRow } from "@/lib/queries/dashboard";

export default function StudentProgressList({
  students,
}: {
  students: StudentRow[];
}) {
  if (students.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
        Ingen aktive elever endnu.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {students.map((s) => {
        const pct =
          s.lessonsTotal > 0
            ? Math.round((s.lessonsDone / s.lessonsTotal) * 100)
            : 0;
        const paused = s.status === "paused";
        return (
          <li key={s.enrollmentId}>
            <Link
              href={`/elever/${s.enrollmentId}`}
              className={`block rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-neutral-300 hover:bg-neutral-50 ${
                paused ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  {s.name}
                  {paused && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      På pause
                    </span>
                  )}
                </span>
                <span className="text-xs text-neutral-500">
                  {s.lessonsDone}/{s.lessonsTotal} lektioner
                </span>
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                {s.currentModule
                  ? `Modul ${s.currentModuleOrder} · ${s.currentModule}`
                  : "Forløb ikke startet / afsluttet"}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
