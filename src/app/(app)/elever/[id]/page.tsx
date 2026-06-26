import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { getStudentProgress } from "@/lib/queries/student";
import StudentChecklist from "@/components/StudentChecklist";

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
      <StudentChecklist progress={progress} />
    </div>
  );
}
