import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import {
  getInstructorDashboard,
  getStudentDashboard,
  type CalEvent,
  type AvailabilityBand,
} from "@/lib/queries/dashboard";
import { startOfWeek, addDays, fmtDayMonth } from "@/lib/dates";
import WeekCalendar from "@/components/WeekCalendar";

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const sp = await searchParams;
  const offset = Number.parseInt(sp.w ?? "0", 10) || 0;
  const weekStart = startOfWeek(addDays(new Date(), offset * 7));
  const weekEnd = addDays(weekStart, 6);
  const weekStartISO = weekStart.toISOString();

  let events: CalEvent[] = [];
  let availability: AvailabilityBand[] = [];
  if (ctx.profile?.role === "student") {
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
      <h1 className="mb-3 text-2xl font-semibold">Kalender</h1>
      <WeekCalendar
        weekStartISO={weekStartISO}
        events={events}
        availability={availability}
      />
      <nav className="mt-4 flex items-center justify-center gap-3 text-sm">
        <Link
          href={`/kalender?w=${offset - 1}`}
          className="rounded-lg border border-neutral-300 px-3 py-1.5"
        >
          ← Forrige
        </Link>
        <span className="text-neutral-500">
          {fmtDayMonth(weekStart)} – {fmtDayMonth(weekEnd)}
          {offset !== 0 && (
            <Link href="/kalender?w=0" className="ml-2 text-blue-600 underline">
              I dag
            </Link>
          )}
        </span>
        <Link
          href={`/kalender?w=${offset + 1}`}
          className="rounded-lg border border-neutral-300 px-3 py-1.5"
        >
          Næste →
        </Link>
      </nav>
    </div>
  );
}
