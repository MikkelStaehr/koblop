import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import {
  getRangeEvents,
  getYearSummary,
  getInstructorDashboard,
  getStudentDashboard,
  type CalEvent,
  type AvailabilityBand,
} from "@/lib/queries/dashboard";
import {
  startOfMonth,
  addMonths,
  startOfWeek,
  addDays,
  fmtMonthYear,
  fmtDayMonth,
} from "@/lib/dates";
import MonthCalendar from "@/components/MonthCalendar";
import MonthStrip from "@/components/MonthStrip";
import MonthBookings from "@/components/MonthBookings";
import WeekCalendar from "@/components/WeekCalendar";

type Role = "student" | "instructor" | "admin";

function ViewToggle({ view }: { view: "maaned" | "uge" }) {
  const base = "px-3 py-1.5 text-sm rounded-lg border";
  const on = "bg-neutral-900 text-white border-neutral-900";
  const off = "border-neutral-300 text-neutral-600";
  return (
    <div className="flex gap-2">
      <Link href="/kalender?view=maaned" className={`${base} ${view === "maaned" ? on : off}`}>
        Måned
      </Link>
      <Link href="/kalender?view=uge" className={`${base} ${view === "uge" ? on : off}`}>
        Uge
      </Link>
    </div>
  );
}

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; m?: string; w?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const sp = await searchParams;
  const view = sp.view === "uge" ? "uge" : "maaned";
  const role = (ctx.profile?.role ?? "instructor") as Role;

  if (view === "uge") {
    const offset = Number.parseInt(sp.w ?? "0", 10) || 0;
    const weekStart = startOfWeek(addDays(new Date(), offset * 7));
    const weekEnd = addDays(weekStart, 6);

    let events: CalEvent[] = [];
    let availability: AvailabilityBand[] = [];
    if (role === "student") {
      const d = await getStudentDashboard(ctx.userId, weekStart);
      if (d) {
        events = d.events;
        availability = d.availability;
      }
    } else {
      const d = await getInstructorDashboard(ctx.userId, weekStart);
      events = d.events;
      availability = d.availability;
    }

    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Kalender</h1>
          <ViewToggle view="uge" />
        </div>
        <WeekCalendar
          weekStartISO={weekStart.toISOString()}
          events={events}
          availability={availability}
        />
        <nav className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Link href={`/kalender?view=uge&w=${offset - 1}`} className="rounded-lg border border-neutral-300 px-3 py-1.5">
            ← Forrige
          </Link>
          <span className="text-neutral-500">
            {fmtDayMonth(weekStart)} – {fmtDayMonth(weekEnd)}
            {offset !== 0 && (
              <Link href="/kalender?view=uge&w=0" className="ml-2 text-blue-600 underline">
                I dag
              </Link>
            )}
          </span>
          <Link href={`/kalender?view=uge&w=${offset + 1}`} className="rounded-lg border border-neutral-300 px-3 py-1.5">
            Næste →
          </Link>
        </nav>
      </div>
    );
  }

  // ── Måneds-visning (standard) ──────────────────────────────────────────
  const offset = Number.parseInt(sp.m ?? "0", 10) || 0;
  const monthStart = startOfMonth(addMonths(new Date(), offset));
  const gridStart = startOfWeek(monthStart);
  const gridEnd = addDays(gridStart, 42);
  const now = new Date();
  const year = monthStart.getFullYear();
  const [events, summary] = await Promise.all([
    getRangeEvents(
      ctx.userId,
      role,
      gridStart.toISOString(),
      gridEnd.toISOString(),
    ),
    getYearSummary(ctx.userId, role, year),
  ]);

  const monthEvents = events.filter((e) => {
    const d = new Date(e.start);
    return d.getMonth() === monthStart.getMonth() && d.getFullYear() === year;
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-semibold capitalize">
          {fmtMonthYear(monthStart)}
        </h1>
        <ViewToggle view="maaned" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <MonthCalendar
            monthStartISO={monthStart.toISOString()}
            events={events}
          />
          <MonthStrip
            year={year}
            summary={summary}
            activeMonth={monthStart.getMonth()}
            nowYear={now.getFullYear()}
            nowMonth={now.getMonth()}
          />
          <nav className="mt-4 flex items-center justify-center gap-3 text-sm">
            <Link href={`/kalender?view=maaned&m=${offset - 1}`} className="rounded-lg border border-neutral-300 px-3 py-1.5">
              ← Forrige måned
            </Link>
            {offset !== 0 && (
              <Link href="/kalender?view=maaned&m=0" className="text-blue-600 underline">
                I dag
              </Link>
            )}
            <Link href={`/kalender?view=maaned&m=${offset + 1}`} className="rounded-lg border border-neutral-300 px-3 py-1.5">
              Næste måned →
            </Link>
          </nav>
        </div>

        <aside>
          <MonthBookings events={monthEvents} />
        </aside>
      </div>
    </div>
  );
}
