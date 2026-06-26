import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AvailabilityEditor from "@/components/AvailabilityEditor";
import type { WeekInput } from "@/lib/actions/availability";

// DB weekday (0=søndag) for en mandag-først-index (0=Man .. 6=Søn).
function mondayToDbWeekday(i: number): number {
  return (i + 1) % 7;
}

export default async function IndstillingerPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.profile?.role === "student") redirect("/");

  const supabase = await createClient();
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("weekday, start_time, end_time")
    .eq("instructor_id", ctx.userId);

  // Map til ugentligt skema, mandag-først. Én blok pr. dag (første regel).
  const week: WeekInput = Array.from({ length: 7 }, (_, i) => {
    const r = (rules ?? []).find((x) => x.weekday === mondayToDbWeekday(i));
    return r
      ? {
          enabled: true,
          start: (r.start_time as string).slice(0, 5),
          end: (r.end_time as string).slice(0, 5),
        }
      : { enabled: false, start: "08:00", end: "16:00" };
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Indstillinger</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Sæt din ugentlige tilgængelighed — de tidsrum hvor elever kan booke
        køretimer hos dig.
      </p>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Tilgængelighed
      </h2>
      <AvailabilityEditor week={week} />

      <p className="mt-6 max-w-xl text-xs text-neutral-400">
        Skoleoplysninger, ressourcer (skolevogne) og afbudsregler kommer her
        senere.
      </p>
    </div>
  );
}
