import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import {
  getInstructorDashboard,
  getStudentDashboard,
  getAgenda,
  getMessages,
} from "@/lib/queries/dashboard";
import type { AgendaItem } from "@/lib/queries/dashboard";
import { getStudentClasses } from "@/lib/queries/classes";
import { startOfWeek, addDays } from "@/lib/dates";
import StudentProgressList from "@/components/StudentProgressList";
import ModuleTimeline from "@/components/ModuleTimeline";
import AgendaList from "@/components/AgendaList";
import StudentClassCard from "@/components/StudentClassCard";
import StudentRequirementsCard from "@/components/StudentRequirementsCard";
import RemindersBox from "@/components/RemindersBox";
import MessagesBox from "@/components/MessagesBox";

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-neutral-700">{title}</h2>
      {href && (
        <Link href={href} className="text-xs text-blue-600 hover:underline">
          Se alt →
        </Link>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  if (!ctx.profile) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
        Din bruger mangler en profil/skole. Bed din kørelærer om at oprette dig.
      </p>
    );
  }

  const weekStart = startOfWeek(new Date());
  const role = ctx.profile.role;
  const messages = await getMessages();
  let agenda = await getAgenda(ctx.userId, role);

  let notices;
  let sideColumn;
  if (role === "student") {
    const [data, classes] = await Promise.all([
      getStudentDashboard(ctx.userId, weekStart),
      getStudentClasses(ctx.userId),
    ]);
    if (!data) {
      return (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          Du har ikke noget aktivt forløb endnu.
        </p>
      );
    }
    // Flet kommende teorigange ind i "Næste 7 dage"-agendaen.
    const in7 = addDays(new Date(), 7).getTime();
    const now = new Date().getTime();
    const theoryItems: AgendaItem[] = classes.sessions
      .filter((s) => {
        const t = new Date(s.startsAt).getTime();
        return t >= now && t < in7;
      })
      .map((s) => ({
        id: `sess-${s.id}`,
        start: s.startsAt,
        end: s.endsAt,
        venueLabel: "Teorihold",
        title: s.topic ?? `${s.moduleTitle} · Teori ${s.lessonNo}`,
        people: s.instructorInitials
          ? [{ name: s.instructorName ?? "", initials: s.instructorInitials }]
          : [],
        tone: "amber",
      }));
    agenda = [...agenda, ...theoryItems].sort((a, b) =>
      a.start.localeCompare(b.start),
    );

    notices = data.notices;
    sideColumn = (
      <>
        <section>
          <SectionHeader title="Mit forløb" />
          <ModuleTimeline modules={data.modules} />
        </section>
        <section className="mt-6">
          <SectionHeader title="Mit teorihold" href="/kalender" />
          <StudentClassCard data={classes} />
        </section>
        {data.requirements.length > 0 && (
          <section className="mt-6">
            <SectionHeader title="Krav uden for moduler" />
            <StudentRequirementsCard requirements={data.requirements} />
          </section>
        )}
      </>
    );
  } else {
    const data = await getInstructorDashboard(ctx.userId, weekStart);
    notices = data.notices;
    sideColumn = (
      <section>
        <SectionHeader
          title={`Aktive elever (${data.students.length})`}
          href="/elever"
        />
        <StudentProgressList students={data.students} />
      </section>
    );
  }

  return (
    <>
      {/* To bokse øverst */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <RemindersBox notices={notices} />
        <MessagesBox messages={messages} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="min-w-0">
          <SectionHeader title="Næste 7 dage" href="/kalender" />
          <AgendaList items={agenda} />
          {role === "student" && (
            <Link
              href="/book"
              className="mt-4 inline-block rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white"
            >
              Book køretime
            </Link>
          )}
        </section>
        {sideColumn}
      </div>
    </>
  );
}
