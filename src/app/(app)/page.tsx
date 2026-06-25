import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import {
  getInstructorDashboard,
  getStudentDashboard,
} from "@/lib/queries/dashboard";
import { startOfWeek, addDays, fmtDayMonth } from "@/lib/dates";
import WeekCalendar from "@/components/WeekCalendar";
import StudentProgressList from "@/components/StudentProgressList";
import ModuleTimeline from "@/components/ModuleTimeline";
import FeedBanner from "@/components/FeedBanner";

export default async function DashboardPage({
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
  const role = ctx.profile?.role;

  if (!ctx.profile) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
        Din bruger mangler en profil/skole. Bed din kørelærer om at oprette dig.
      </p>
    );
  }

  const weekNav = (
    <nav className="mt-4 flex items-center justify-center gap-3 text-sm">
      <Link
        href={`/?w=${offset - 1}`}
        className="rounded-lg border border-neutral-300 px-3 py-1.5"
      >
        ← Forrige
      </Link>
      <span className="text-neutral-500">
        {fmtDayMonth(weekStart)} – {fmtDayMonth(weekEnd)}
        {offset !== 0 && (
          <Link href="/?w=0" className="ml-2 text-blue-600 underline">
            I dag
          </Link>
        )}
      </span>
      <Link
        href={`/?w=${offset + 1}`}
        className="rounded-lg border border-neutral-300 px-3 py-1.5"
      >
        Næste →
      </Link>
    </nav>
  );

  if (role === "student") {
    const data = await getStudentDashboard(ctx.userId, weekStart);
    if (!data) {
      return (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          Du har ikke noget aktivt forløb endnu.
        </p>
      );
    }
    return (
      <>
        <FeedBanner notices={data.notices} />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="min-w-0">
            <h2 className="mb-2 text-sm font-semibold text-neutral-700">
              Min kalender
            </h2>
            <WeekCalendar
              weekStartISO={weekStartISO}
              events={data.events}
              availability={data.availability}
            />
            {weekNav}
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold text-neutral-700">
              Mit forløb
            </h2>
            <ModuleTimeline modules={data.modules} />
          </section>
        </div>
      </>
    );
  }

  const { students, events, availability, notices } =
    await getInstructorDashboard(ctx.userId, weekStart);
  return (
    <>
      <FeedBanner notices={notices} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">
            Kalender
          </h2>
          <WeekCalendar
            weekStartISO={weekStartISO}
            events={events}
            availability={availability}
          />
          <p className="mt-1 text-xs text-neutral-400">
            Blå felter = din tilgængelighed · farvede blokke = bookinger
          </p>
          {weekNav}
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">
            Aktive elever ({students.length})
          </h2>
          <StudentProgressList students={students} />
        </section>
      </div>
    </>
  );
}
