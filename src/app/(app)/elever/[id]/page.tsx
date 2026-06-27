import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { getStudentProgress } from "@/lib/queries/student";
import StudentChecklist from "@/components/StudentChecklist";
import RequirementsChecklist from "@/components/RequirementsChecklist";
import StudentAdmin from "@/components/StudentAdmin";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.profile?.role === "student") redirect("/");

  const { id } = await params;
  const progress = await getStudentProgress(id);
  if (!progress) notFound();

  return (
    <div>
      <Link
        href="/elever"
        className="text-sm text-neutral-500 transition hover:text-black"
      >
        ← Elever
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold">
        {progress.studentName}
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        Kryds lektioner af når eleven har gennemført dem, og godkend modulet for
        at låse det næste op.
      </p>
      {progress.status === "paused" && (
        <p className="mb-6 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Dette forløb er på pause — eleven kan ikke booke køretimer.
        </p>
      )}
      <StudentChecklist progress={progress} />

      {progress.requirements.length > 0 && (
        <section className="mt-8 max-w-xl">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Krav uden for moduler
          </h2>
          <RequirementsChecklist
            enrollmentId={progress.enrollmentId}
            requirements={progress.requirements}
          />
        </section>
      )}

      <section className="mt-8 max-w-xl">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Elevadministration
        </h2>
        <StudentAdmin
          enrollmentId={progress.enrollmentId}
          status={progress.status}
          studentName={progress.studentName}
        />
      </section>
    </div>
  );
}
