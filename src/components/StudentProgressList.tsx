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
        return (
          <li
            key={s.enrollmentId}
            className="rounded-xl border border-neutral-200 bg-white p-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{s.name}</span>
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
          </li>
        );
      })}
    </ul>
  );
}
