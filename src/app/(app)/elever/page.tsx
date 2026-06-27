import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getStudentRoster } from "@/lib/queries/dashboard";
import StudentProgressList from "@/components/StudentProgressList";
import CreateStudentForm from "@/components/CreateStudentForm";

export default async function EleverPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.profile?.role === "student") redirect("/");

  const students = await getStudentRoster();
  const activeCount = students.filter((s) => s.status === "active").length;
  const pausedCount = students.length - activeCount;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Elever</h1>
      <p className="mb-5 text-sm text-neutral-500">
        {activeCount} aktive
        {pausedCount > 0 ? ` · ${pausedCount} på pause` : ""}
      </p>
      <div className="mb-6">
        <CreateStudentForm />
      </div>
      <StudentProgressList students={students} />
    </div>
  );
}
