"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EventTypeKey } from "@/lib/domain";

// Opret et gruppe-event (manøvrebane/glatbane/førstehjælp) og tilmeld elever.
export async function createEvent(input: {
  type: EventTypeKey;
  startISO: string;
  durationMin: number;
  location?: string;
  title?: string;
  enrollmentIds: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Ikke logget ind." };
  const { data: prof } = await supabase
    .from("profiles")
    .select("role, school_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!prof || prof.role === "student")
    return { ok: false, error: "Kun kørelærer kan oprette events." };

  const start = new Date(input.startISO);
  if (Number.isNaN(start.getTime()))
    return { ok: false, error: "Ugyldigt tidspunkt." };
  const end = new Date(start.getTime() + input.durationMin * 60000);

  const { data: ev, error } = await supabase
    .from("school_events")
    .insert({
      school_id: prof.school_id as string,
      instructor_id: user.id,
      type: input.type,
      title: input.title || null,
      location: input.location || null,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  if (input.enrollmentIds.length > 0) {
    const { error: ae } = await supabase.from("event_attendees").insert(
      input.enrollmentIds.map((eid) => ({
        event_id: ev.id,
        enrollment_id: eid,
      })),
    );
    if (ae) return { ok: false, error: ae.message };
  }

  revalidatePath("/kalender");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteEvent(
  eventId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("school_events")
    .delete()
    .eq("id", eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/kalender");
  revalidatePath("/");
  return { ok: true };
}
