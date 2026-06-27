import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AvailabilityEditor from "@/components/AvailabilityEditor";
import SchoolSettingsForm from "@/components/SchoolSettingsForm";
import ResourcesManager, {
  type ResourceItem,
} from "@/components/ResourcesManager";
import type { WeekInput } from "@/lib/actions/availability";

// DB weekday (0=søndag) for en mandag-først-index (0=Man .. 6=Søn).
function mondayToDbWeekday(i: number): number {
  return (i + 1) % 7;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
      {children}
    </h2>
  );
}

export default async function IndstillingerPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.profile?.role === "student") redirect("/");

  const supabase = await createClient();
  const [{ data: rules }, { data: school }, { data: resources }] =
    await Promise.all([
      supabase
        .from("availability_rules")
        .select("weekday, start_time, end_time")
        .eq("instructor_id", ctx.userId),
      supabase
        .from("schools")
        .select("name, cancellation_window_hours")
        .eq("id", ctx.profile?.school_id ?? "")
        .maybeSingle(),
      supabase
        .from("resources")
        .select("id, name, type, active")
        .order("name", { ascending: true }),
    ]);

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
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="mb-1 text-2xl font-semibold">Indstillinger</h1>
        <p className="text-sm text-neutral-500">
          Tilgængelighed, skoleoplysninger, afbudsfrist og skolevogne.
        </p>
      </div>

      <section>
        <SectionTitle>Tilgængelighed</SectionTitle>
        <p className="mb-3 max-w-xl text-sm text-neutral-500">
          De tidsrum hvor elever kan booke køretimer hos dig.
        </p>
        <AvailabilityEditor week={week} />
      </section>

      <section>
        <SectionTitle>Skole & afbudsfrist</SectionTitle>
        {school ? (
          <SchoolSettingsForm
            name={school.name}
            cancellationWindowHours={school.cancellation_window_hours}
          />
        ) : (
          <p className="text-sm text-neutral-500">Ingen skole tilknyttet.</p>
        )}
      </section>

      <section>
        <SectionTitle>Skolevogne</SectionTitle>
        <p className="mb-3 max-w-xl text-sm text-neutral-500">
          Skolens køretøjer. Inaktive vogne kan beholdes uden at være i brug.
        </p>
        <ResourcesManager resources={(resources ?? []) as ResourceItem[]} />
      </section>
    </div>
  );
}
