// Demo-seed: opretter en skole, en kørelærer, tre elever med forløb,
// tilgængelighed og et par bookinger — så dashboardet har noget at vise.
// Kør:  npm run seed:demo
// Idempotent: kan køres igen uden at lave dubletter.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const PASSWORD = "Driwe1234!";

async function getOrCreateUser(email, fullName) {
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return data.user.id;
}

function at(monday, dayOffset, h, m) {
  const d = new Date(monday);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

async function main() {
  // ── Skole ────────────────────────────────────────────────────────────
  let { data: school } = await sb
    .from("schools")
    .select("id")
    .eq("name", "Demo Køreskole")
    .maybeSingle();
  if (!school) {
    const { data, error } = await sb
      .from("schools")
      .insert({ name: "Demo Køreskole" })
      .select("id")
      .single();
    if (error) throw error;
    school = data;
  }
  const schoolId = school.id;

  const { data: cat } = await sb
    .from("categories")
    .select("id")
    .eq("code", "B")
    .single();
  const categoryId = cat.id;

  // ── Kørelærer ────────────────────────────────────────────────────────
  const instructorId = await getOrCreateUser("laerer@driwe.test", "Lars Lærer");
  await sb.from("profiles").upsert({
    id: instructorId,
    school_id: schoolId,
    role: "instructor",
    full_name: "Lars Lærer",
    email: "laerer@driwe.test",
  });

  // ── Ressource ────────────────────────────────────────────────────────
  let { data: car } = await sb
    .from("resources")
    .select("id")
    .eq("school_id", schoolId)
    .eq("name", "Skolevogn 1")
    .maybeSingle();
  if (!car) {
    const { data } = await sb
      .from("resources")
      .insert({ school_id: schoolId, name: "Skolevogn 1" })
      .select("id")
      .single();
    car = data;
  }

  // ── Tilgængelighed: man-fre 08-16 ────────────────────────────────────
  const { count: avCount } = await sb
    .from("availability_rules")
    .select("id", { count: "exact", head: true })
    .eq("instructor_id", instructorId);
  if (!avCount) {
    await sb.from("availability_rules").insert(
      [1, 2, 3, 4, 5].map((weekday) => ({
        school_id: schoolId,
        instructor_id: instructorId,
        weekday, // 1 = mandag (DB: 0 = søndag)
        start_time: "08:00",
        end_time: "16:00",
      })),
    );
  }

  // ── Elever + forløb ──────────────────────────────────────────────────
  const students = [
    { email: "anna@driwe.test", name: "Anna Andersen", advance: 1 },
    { email: "bo@driwe.test", name: "Bo Bertelsen", advance: 0 },
    { email: "clara@driwe.test", name: "Clara Christiansen", advance: 0 },
  ];

  const enrollmentByEmail = {};
  for (const s of students) {
    const sid = await getOrCreateUser(s.email, s.name);
    await sb.from("profiles").upsert({
      id: sid,
      school_id: schoolId,
      role: "student",
      full_name: s.name,
      email: s.email,
    });
    let { data: enr } = await sb
      .from("enrollments")
      .select("id")
      .eq("student_id", sid)
      .eq("category_id", categoryId)
      .maybeSingle();
    if (!enr) {
      const { data, error } = await sb
        .from("enrollments")
        .insert({
          school_id: schoolId,
          student_id: sid,
          category_id: categoryId,
          primary_instructor_id: instructorId,
        })
        .select("id")
        .single();
      if (error) throw error;
      enr = data; // trigger har seedet module_/lesson_progress
    }
    enrollmentByEmail[s.email] = enr.id;
  }

  // ── Modul-ids for kat. B ─────────────────────────────────────────────
  const { data: mods } = await sb
    .from("modules")
    .select("id, order_index")
    .eq("category_id", categoryId)
    .order("order_index");
  const moduleByOrder = Object.fromEntries(mods.map((m) => [m.order_index, m.id]));

  // ── Anna: gennemfør modul 1, åbn modul 2, tag teori i modul 2 ────────
  const annaEnr = enrollmentByEmail["anna@driwe.test"];

  // Modul 1: alle lektioner godkendt (modul 1 er ren teori)
  await sb
    .from("lesson_progress")
    .update({ status: "godkendt" })
    .eq("enrollment_id", annaEnr)
    .eq("module_id", moduleByOrder[1]);
  // Modul 1 gennemført -> trigger åbner modul 2
  await sb
    .from("module_progress")
    .update({ status: "gennemfoert", signed_off_by: instructorId, signed_off_at: new Date().toISOString() })
    .eq("enrollment_id", annaEnr)
    .eq("module_id", moduleByOrder[1]);
  // Modul 2: teori gennemført (så praksis kan bookes)
  await sb
    .from("lesson_progress")
    .update({ status: "gennemfoert" })
    .eq("enrollment_id", annaEnr)
    .eq("module_id", moduleByOrder[2])
    .eq("type", "teori");

  // ── Booking: Anna, modul 2 praksis #1, tirsdag 10:00 denne uge ───────
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  const { data: praksis1 } = await sb
    .from("lesson_progress")
    .select("id")
    .eq("enrollment_id", annaEnr)
    .eq("module_id", moduleByOrder[2])
    .eq("type", "praksis")
    .eq("lesson_no", 1)
    .single();

  const { count: bCount } = await sb
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", praksis1.id);
  if (!bCount) {
    const start = at(monday, 1, 10, 0); // tirsdag 10:00
    const end = at(monday, 1, 10, 45);
    await sb.from("bookings").insert({
      school_id: schoolId,
      enrollment_id: annaEnr,
      lesson_id: praksis1.id,
      instructor_id: instructorId,
      resource_id: car.id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
    });
  }

  console.log("\n✅ Demo-data seedet.\n");
  console.log("Log ind på http://localhost:3000/login");
  console.log("  Kørelærer:  laerer@driwe.test");
  console.log("  Elever:     anna@driwe.test / bo@driwe.test / clara@driwe.test");
  console.log(`  Kodeord:    ${PASSWORD}\n`);
}

main().catch((e) => {
  console.error("Seed fejlede:", e.message);
  process.exit(1);
});
