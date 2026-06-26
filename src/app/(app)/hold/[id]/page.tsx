import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import {
  getClassDetail,
  getAssignableEnrollments,
  getTheoryModules,
} from "@/lib/queries/classes";
import ClassMembers from "@/components/ClassMembers";
import CreateSessionForm from "@/components/CreateSessionForm";
import { fmtTime } from "@/lib/dates";

function fmtSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("da-DK", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.profile?.role === "student") redirect("/");

  const { id } = await params;
  const [detail, assignable, modules] = await Promise.all([
    getClassDetail(id),
    getAssignableEnrollments(id),
    getTheoryModules(),
  ]);
  if (!detail) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <Link
          href="/hold"
          className="text-sm text-neutral-500 transition hover:text-black"
        >
          ← Hold
        </Link>
        <h1 className="mb-1 mt-2 text-2xl font-semibold">{detail.name}</h1>
        {detail.instructorName && (
          <p className="text-sm text-neutral-500">{detail.instructorName}</p>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Elever på holdet
        </h2>
        <ClassMembers
          classId={detail.id}
          members={detail.members}
          assignable={assignable}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Teorigange
        </h2>
        <div className="mb-4">
          <CreateSessionForm classId={detail.id} modules={modules} />
        </div>
        {detail.sessions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            Ingen teorigange planlagt endnu.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {detail.sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/hold/${detail.id}/session/${s.id}`}
                  className="block rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">
                      Modul {s.moduleOrder} · Teori {s.lessonNo}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {s.presentCount}/{detail.members.length} til stede
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {fmtSessionDate(s.startsAt)} {fmtTime(new Date(s.startsAt))}–
                    {fmtTime(new Date(s.endsAt))}
                    {s.topic ? ` · ${s.topic}` : ""}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
