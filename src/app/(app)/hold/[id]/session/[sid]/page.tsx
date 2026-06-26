import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { getSessionAttendance } from "@/lib/queries/classes";
import AttendanceList from "@/components/AttendanceList";
import { fmtTime } from "@/lib/dates";

export default async function SessionAttendancePage({
  params,
}: {
  params: Promise<{ id: string; sid: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.profile?.role === "student") redirect("/");

  const { id, sid } = await params;
  const session = await getSessionAttendance(sid);
  if (!session) notFound();

  const when = new Date(session.startsAt).toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="max-w-2xl">
      <Link
        href={`/hold/${id}`}
        className="text-sm text-neutral-500 transition hover:text-black"
      >
        ← Tilbage til holdet
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold">
        {session.moduleTitle} · Teori {session.lessonNo}
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        {when} kl. {fmtTime(new Date(session.startsAt))} — kryds af hvem der var
        til stede. Fremmøde gennemfører elevens teorilektion.
      </p>
      <AttendanceList session={session} />
    </div>
  );
}
