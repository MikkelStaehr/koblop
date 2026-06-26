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
