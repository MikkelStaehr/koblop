import Link from "next/link";
import type { MonthSummary } from "@/lib/queries/dashboard";

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "maj",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

// Farve + kort label pr. lokation/appointment-type.
const VENUE_PILL: Record<string, { label: string; cls: string }> = {
  vej: { label: "Vej", cls: "bg-blue-100 text-blue-700" },
  lukket_oevelsesplads: { label: "Manøvre", cls: "bg-amber-100 text-amber-700" },
  koereteknisk_anlaeg: { label: "Glat", cls: "bg-violet-100 text-violet-700" },
  teorilokale: { label: "Teori", cls: "bg-emerald-100 text-emerald-700" },
};

// Vandret måneds-stribe: klik for at hoppe til måneden; piller viser antal pr. type.
export default function MonthStrip({
  year,
  summary,
  activeMonth,
  nowYear,
  nowMonth,
}: {
  year: number;
  summary: MonthSummary[];
  activeMonth: number;
  nowYear: number;
  nowMonth: number;
}) {
  return (
    <div className="mt-5 overflow-x-auto">
      <div className="flex min-w-max gap-2 pb-1">
        {summary.map((s) => {
          const offset = (year - nowYear) * 12 + (s.month - nowMonth);
          const active = s.month === activeMonth;
          const pills = Object.entries(s.counts);
          return (
            <Link
              key={s.month}
              href={`/kalender?view=maaned&m=${offset}`}
              className={`flex w-28 shrink-0 flex-col gap-1.5 rounded-xl border p-2.5 transition ${
                active
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              <span
                className={`text-sm font-semibold capitalize ${
                  active ? "text-neutral-900" : "text-neutral-600"
                }`}
              >
                {MONTHS[s.month]}
              </span>
              <div className="flex flex-wrap gap-1">
                {pills.length === 0 ? (
                  <span className="text-[11px] text-neutral-300">—</span>
                ) : (
                  pills.map(([v, n]) => {
                    const p = VENUE_PILL[v] ?? {
                      label: v,
                      cls: "bg-neutral-100 text-neutral-600",
                    };
                    return (
                      <span
                        key={v}
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${p.cls}`}
                      >
                        {n} {p.label}
                      </span>
                    );
                  })
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
