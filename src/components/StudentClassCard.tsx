import type { StudentClasses } from "@/lib/queries/classes";
import { fmtTime } from "@/lib/dates";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("da-DK", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function StudentClassCard({ data }: { data: StudentClasses }) {
  if (data.holds.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
        Du er ikke knyttet til et teorihold endnu.
      </p>
    );
  }

  const now = new Date().getTime();
  const upcoming = data.sessions.filter(
    (s) => new Date(s.endsAt).getTime() >= now,
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      {data.holds.map((h) => (
        <div key={h.id}>
          <div className="font-medium">{h.name}</div>
          {h.instructorName && (
            <div className="text-xs text-neutral-500">{h.instructorName}</div>
          )}
        </div>
      ))}

      <div>
        <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-400">
          Kommende teorigange
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Ingen planlagte teorigange lige nu.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.slice(0, 4).map((s) => (
              <li key={s.id} className="flex items-baseline gap-2 text-sm">
                <span className="w-28 shrink-0 text-neutral-500">
                  {fmtDate(s.startsAt)} {fmtTime(new Date(s.startsAt))}
                </span>
                <span className="min-w-0 truncate">
                  {s.topic ?? `${s.moduleTitle} · Teori ${s.lessonNo}`}
                </span>
              </li>
            ))}
            {upcoming.length > 4 && (
              <li className="text-xs text-neutral-400">
                +{upcoming.length - 4} flere
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
