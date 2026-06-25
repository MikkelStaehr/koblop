import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import {
  getInstructorDashboard,
  getStudentDashboard,
  getUpcoming,
} from "@/lib/queries/dashboard";
import { startOfWeek } from "@/lib/dates";
import StudentProgressList from "@/components/StudentProgressList";
import ModuleTimeline from "@/components/ModuleTimeline";
import FeedBanner from "@/components/FeedBanner";
import Upcoming from "@/components/Upcoming";

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

  if (role === "student") {
    const data = await getStudentDashboard(ctx.userId, weekStart);
    if (!data) {
      return (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          Du har ikke noget aktivt forløb endnu.
        </p>
      );
    }
    const upcoming = await getUpcoming(ctx.userId, "student");
    return (
      <>
        <FeedBanner notices={data.notices} />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="min-w-0">
            <SectionHeader title="Næste 7 dage" href="/kalender" />
            <Upcoming events={upcoming} />
            <Link
              href="/book"
              className="mt-4 inline-block rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white"
            >
              Book køretime
            </Link>
          </section>
          <section>
            <SectionHeader title="Mit forløb" />
            <ModuleTimeline modules={data.modules} />
          </section>
        </div>
      </>
    );
  }

  const { students, notices } = await getInstructorDashboard(
    ctx.userId,
    weekStart,
  );
  const upcoming = await getUpcoming(ctx.userId, role);
  return (
    <>
      <FeedBanner notices={notices} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="min-w-0">
          <SectionHeader title="Næste 7 dage" href="/kalender" />
          <Upcoming events={upcoming} />
        </section>
        <section>
          <SectionHeader title={`Aktive elever (${students.length})`} href="/elever" />
          <StudentProgressList students={students} />
        </section>
      </div>
    </>
  );
}
