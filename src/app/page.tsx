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
import SignOutButton from "@/components/SignOutButton";
import Logo from "@/components/Logo";

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

  const profile = ctx.profile;
  const role = profile?.role;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <Logo className="text-2xl" />
          <h1 className="sr-only">koblop</h1>
          <p className="text-sm text-neutral-500">
            {profile?.full_name ?? ctx.email}
            {role && (
              <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs">
                {role === "student"
                  ? "Elev"
                  : role === "instructor"
                    ? "Kørelærer"
                    : "Admin"}
              </span>
            )}
          </p>
        </div>
        <SignOutButton />
      </header>

      {!profile ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          Din bruger mangler en profil/skole. Bed din kørelærer om at oprette dig.
        </p>
      ) : role === "student" ? (
        <StudentView
          userId={ctx.userId}
          weekStart={weekStart}
          weekStartISO={weekStartISO}
        />
      ) : (
        <InstructorView
          userId={ctx.userId}
          weekStart={weekStart}
          weekStartISO={weekStartISO}
        />
      )}

      {/* Uge-navigation */}
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
    </main>
  );
}

async function InstructorView({
  userId,
  weekStart,
  weekStartISO,
}: {
  userId: string;
  weekStart: Date;
  weekStartISO: string;
}) {
  const { students, events, availability } = await getInstructorDashboard(
    userId,
    weekStart,
  );
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Kalender</h2>
        <WeekCalendar
          weekStartISO={weekStartISO}
          events={events}
          availability={availability}
        />
        <p className="mt-1 text-xs text-neutral-400">
          Blå felter = din tilgængelighed · farvede blokke = bookinger
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">
          Aktive elever ({students.length})
        </h2>
        <StudentProgressList students={students} />
      </section>
    </div>
  );
}

async function StudentView({
  userId,
  weekStart,
  weekStartISO,
}: {
  userId: string;
  weekStart: Date;
  weekStartISO: string;
}) {
  const data = await getStudentDashboard(userId, weekStart);
  if (!data) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
        Du har ikke noget aktivt forløb endnu.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">
          Min kalender
        </h2>
        <WeekCalendar
          weekStartISO={weekStartISO}
          events={data.events}
          availability={data.availability}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">
          Mit forløb
        </h2>
        <ModuleTimeline modules={data.modules} />
      </section>
    </div>
  );
}
