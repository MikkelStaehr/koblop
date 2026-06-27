"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Opretter en ny elev: auth-bruger (bekræftet), profil og enrollment (kat. B).
// Enrollment-triggeren seeder elevens modul/lektionsforløb. Returnerer et
// login-link kørelæreren kan dele med eleven (virker også uden SMTP).
export async function createStudent(input: {
  fullName: string;
  email: string;
  phone?: string;
}): Promise<{ ok: boolean; error?: string; loginLink?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Du er ikke logget ind." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, school_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "instructor" && profile.role !== "admin"))
    return { ok: false, error: "Kun kørelærere kan oprette elever." };
  if (!profile.school_id)
    return { ok: false, error: "Din profil mangler en skole." };

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  if (!fullName) return { ok: false, error: "Eleven skal have et navn." };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: "Angiv en gyldig e-mail." };

  const admin = createAdminClient();

  const { data: cat } = await admin
    .from("categories")
    .select("id")
    .eq("code", "B")
    .maybeSingle();
  if (!cat) return { ok: false, error: "Kategori B findes ikke i læreplanen." };

  // Opret auth-bruger (bekræftet, uden password — eleven logger ind via link).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createErr || !created?.user) {
    const msg = createErr?.message ?? "Kunne ikke oprette eleven.";
    return {
      ok: false,
      error: /already.*registered|email_exists|exists/i.test(msg)
        ? "Der findes allerede en bruger med den e-mail."
        : msg,
    };
  }
  const studentId = created.user.id;

  const { error: profErr } = await admin.from("profiles").insert({
    id: studentId,
    school_id: profile.school_id,
    role: "student",
    full_name: fullName,
    email,
    phone,
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(studentId);
    return { ok: false, error: profErr.message };
  }

  const { error: enrErr } = await admin.from("enrollments").insert({
    school_id: profile.school_id,
    student_id: studentId,
    category_id: cat.id,
    primary_instructor_id: user.id,
    status: "active",
  });
  if (enrErr) {
    await admin.from("profiles").delete().eq("id", studentId);
    await admin.auth.admin.deleteUser(studentId);
    return { ok: false, error: enrErr.message };
  }

  // Generér et login-link til eleven (best effort — fejler ikke oprettelsen).
  let loginLink: string | undefined;
  try {
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "http";
    const { data: link } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${proto}://${host}/auth/callback` },
    });
    loginLink = link?.properties?.action_link;
  } catch {
    // ignorér — eleven kan også logge ind via magisk link på login-siden
  }

  revalidatePath("/elever");
  revalidatePath("/");
  return { ok: true, loginLink };
}

async function requireStaffSchool() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { supabase, user: null as null, schoolId: null, error: "Du er ikke logget ind." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, school_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "instructor" && profile.role !== "admin"))
    return { supabase, user: null as null, schoolId: null, error: "Kun kørelærere kan administrere elever." };
  return { supabase, user, schoolId: profile.school_id, error: undefined };
}

// Sæt en elevs forløb på pause eller genaktivér. Pauserede kan ikke booke og
// falder ud af aktive lister (RLS enrollment_write_staff håndhæver ejerskab).
export async function setEnrollmentStatus(
  enrollmentId: string,
  status: "active" | "paused",
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user, error } = await requireStaffSchool();
  if (error || !user) return { ok: false, error };

  const { error: upErr } = await supabase
    .from("enrollments")
    .update({ status })
    .eq("id", enrollmentId);
  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath("/elever");
  revalidatePath(`/elever/${enrollmentId}`);
  revalidatePath("/");
  return { ok: true };
}

// Slet en elev permanent. Sletter auth-brugeren → kaskaderer profil, forløb,
// bookinger og holdmedlemskab via FK on delete cascade.
export async function deleteStudent(
  enrollmentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { user, schoolId, error } = await requireStaffSchool();
  if (error || !user) return { ok: false, error };
  if (!schoolId) return { ok: false, error: "Din profil mangler en skole." };

  // Slå eleven op via forløbet og bekræft samme skole (admin omgår RLS).
  const admin = createAdminClient();
  const { data: enr } = await admin
    .from("enrollments")
    .select("student_id, school_id")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (!enr) return { ok: false, error: "Eleven blev ikke fundet." };
  if (enr.school_id !== schoolId)
    return { ok: false, error: "Eleven hører til en anden skole." };

  const { error: delErr } = await admin.auth.admin.deleteUser(enr.student_id);
  if (delErr) return { ok: false, error: delErr.message };

  revalidatePath("/elever");
  revalidatePath("/");
  return { ok: true };
}
