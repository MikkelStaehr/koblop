import { createClient } from "@/lib/supabase/server";
import type { LessonType, LessonStatus, ModuleStatus } from "@/lib/database.types";

// En elev der er klar til at få planlagt sin næste køretime (af kørelæreren).
export interface Schedulable {
  enrollmentId: string;
  lessonId: string;
  studentName: string;
  lessonLabel: string;
}

const DONE: LessonStatus[] = ["gennemfoert", "godkendt"];

// Alle aktive elever (til at tilmelde et gruppe-event).
export interface ActiveEnrollment {
  enrollmentId: string;
  name: string;
}

export async function getActiveEnrollments(): Promise<ActiveEnrollment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select(`id, student:profiles!student_id(full_name)`)
    .eq("status", "active");
  const rows = (data ?? []) as unknown as {
    id: string;
    student: { full_name: string | null } | null;
  }[];
  return rows
    .map((r) => ({
      enrollmentId: r.id,
      name: r.student?.full_name ?? "Elev",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "da"));
}

interface RawEnr {
  id: string;
  student: { full_name: string | null } | null;
  module_progress: {
    order_index: number;
    status: ModuleStatus;
    module_id: string;
    module: { title: string } | null;
  }[];
  lesson_progress: {
    id: string;
    module_id: string;
    type: LessonType;
    status: LessonStatus;
    lesson_no: number;
  }[];
}

// Aktive elever hvis aktuelle modul har en ledig køretime (teori taget).
// RLS sikrer at staff kun ser egen skoles elever.
export async function getSchedulableStudents(): Promise<Schedulable[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select(
      `id, student:profiles!student_id(full_name),
       module_progress(order_index, status, module_id, module:modules!module_id(title)),
       lesson_progress(id, module_id, type, status, lesson_no)`,
    )
    .eq("status", "active");

  const rows = (data ?? []) as unknown as RawEnr[];
  const out: Schedulable[] = [];
  for (const e of rows) {
    const active = e.module_progress
      .filter((m) => m.status === "i_gang")
      .sort((a, b) => a.order_index - b.order_index)[0];
    if (!active) continue;
    const ml = e.lesson_progress.filter((l) => l.module_id === active.module_id);
    const teoriDone = ml
      .filter((l) => l.type === "teori")
      .every((l) => DONE.includes(l.status));
    if (!teoriDone) continue;
    const next = ml
      .filter((l) => l.type === "praksis" && l.status === "ikke_planlagt")
      .sort((a, b) => a.lesson_no - b.lesson_no)[0];
    if (!next) continue;
    out.push({
      enrollmentId: e.id,
      lessonId: next.id,
      studentName: e.student?.full_name ?? "Elev",
      lessonLabel: `${active.module?.title ?? "Modul"} · Køretime ${next.lesson_no}`,
    });
  }
  return out.sort((a, b) => a.studentName.localeCompare(b.studentName, "da"));
}
