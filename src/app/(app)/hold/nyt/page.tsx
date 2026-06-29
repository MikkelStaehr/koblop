import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getActiveEnrollments } from "@/lib/queries/schedule";
import ClassWizard from "@/components/ClassWizard";

export default async function NytHoldPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.profile?.role === "student") redirect("/");

  const students = await getActiveEnrollments();

  return (
    <div className="mx-auto max-w-2xl">
      <ClassWizard students={students} />
    </div>
  );
}
