import { createClient } from "@/lib/supabase/server";
import type {
  LessonType,
  LessonStatus,
  ModuleStatus,
  PracticalVenue,
} from "@/lib/database.types";

export interface ChecklistLesson {
  id: string;
  lessonNo: number;
  type: LessonType;
  venue: PracticalVenue;
  status: LessonStatus;
  selvstudium: boolean;
  scheduledAt: string | null;
}

export interface ChecklistModule {
  progressId: string;
  order: number;
  title: string;
  status: ModuleStatus;
  lessons: ChecklistLesson[];
  approvedLessons: number;
  totalLessons: number;
}

export interface StudentProgress {
  enrollmentId: string;
  studentName: string;
  studentEmail: string | null;
  modules: ChecklistModule[];
}

interface RawEnrollment {
  id: string;
  student: { full_name: string | null; email: string | null } | null;
  module_progress: {
    id: string;
    order_index: number;
    status: ModuleStatus;
    module_id: string;
    module: { title: string } | null;
  }[];
  lesson_progress: {
    id: string;
    module_id: string;
    lesson_no: number;
    type: LessonType;
    venue: PracticalVenue;
    status: LessonStatus;
    selvstudium: boolean;
    scheduled_at: string | null;
  }[];
}

// Ét elevforløb med moduler + lektioner til lærerens afkrydsning.
// RLS begrænser til staff i samme skole (eller eleven selv) — null = ingen adgang.
export async function getStudentProgress(
  enrollmentId: string,
): Promise<StudentProgress | null> {
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("enrollments")
    .select(
      `id,
       student:profiles!student_id(full_name, email),
       module_progress(id, order_index, status, module_id, module:modules!module_id(title)),
       lesson_progress(id, module_id, lesson_no, type, venue, status, selvstudium, scheduled_at)`,
    )
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!raw) return null;
  const e = raw as unknown as RawEnrollment;

  const modules: ChecklistModule[] = e.module_progress
    .sort((a, b) => a.order_index - b.order_index)
    .map((m) => {
      const lessons = e.lesson_progress
        .filter((l) => l.module_id === m.module_id)
        .sort((a, b) =>
          a.type === b.type
            ? a.lesson_no - b.lesson_no
            : a.type === "teori"
              ? -1
              : 1,
        )
        .map((l) => ({
          id: l.id,
          lessonNo: l.lesson_no,
          type: l.type,
          venue: l.venue,
          status: l.status,
          selvstudium: l.selvstudium,
          scheduledAt: l.scheduled_at,
        }));
      return {
        progressId: m.id,
        order: m.order_index,
        title: m.module?.title ?? `Modul ${m.order_index}`,
        status: m.status,
        lessons,
        approvedLessons: lessons.filter((l) => l.status === "godkendt").length,
        totalLessons: lessons.length,
      };
    });

  return {
    enrollmentId: e.id,
    studentName: e.student?.full_name ?? "Ukendt elev",
    studentEmail: e.student?.email ?? null,
    modules,
  };
}
