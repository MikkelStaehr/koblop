"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Én tidsblok pr. ugedag, mandag-først (index 0 = mandag .. 6 = søndag).
// DB bruger weekday 0 = søndag, så vi konverterer ved skrivning.
export interface DayInput {
  enabled: boolean;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}
export type WeekInput = DayInput[]; // forventet længde 7, mandag-først

const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function mondayToDbWeekday(i: number): number {
  return (i + 1) % 7; // 0=Man -> 1, 6=Søn -> 0
}

// Erstatter kørelærerens ugentlige tilgængelighed med den angivne uge.
export async function saveAvailability(
  week: WeekInput,
): Promise<{ ok: boolean; error?: string }> {
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
    return { ok: false, error: "Kun kørelærere kan sætte tilgængelighed." };
  if (!profile.school_id)
    return { ok: false, error: "Din profil mangler en skole." };

  if (!Array.isArray(week) || week.length !== 7)
    return { ok: false, error: "Ugyldigt skema." };

  const rows: {
    school_id: string;
    instructor_id: string;
    weekday: number;
    start_time: string;
    end_time: string;
  }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = week[i];
    if (!d?.enabled) continue;
    if (!HM.test(d.start) || !HM.test(d.end))
      return { ok: false, error: "Ugyldigt tidsformat (brug TT:MM)." };
    if (d.start >= d.end)
      return { ok: false, error: "Sluttid skal ligge efter starttid." };
    rows.push({
      school_id: profile.school_id,
      instructor_id: user.id,
      weekday: mondayToDbWeekday(i),
      start_time: d.start,
      end_time: d.end,
    });
  }

  // Rewrite: ryd egne regler, indsæt de nye (RLS sikrer kun egne rækker).
  const { error: delErr } = await supabase
    .from("availability_rules")
    .delete()
    .eq("instructor_id", user.id);
  if (delErr) return { ok: false, error: delErr.message };

  if (rows.length > 0) {
    const { error: insErr } = await supabase
      .from("availability_rules")
      .insert(rows);
    if (insErr) return { ok: false, error: insErr.message };
  }

  revalidatePath("/indstillinger");
  revalidatePath("/book");
  revalidatePath("/kalender");
  revalidatePath("/");
  return { ok: true };
}
