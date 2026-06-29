import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { listClasses } from "@/lib/queries/classes";

export default async function HoldPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.profile?.role === "student") redirect("/");

  const classes = await listClasses();

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-semibold">Hold</h1>
          <p className="max-w-2xl text-sm text-neutral-500">
            Teorihold — fælles teoriundervisning som elever knyttes til. Kryds
            fremmøde af på en teorigang; det gennemfører elevernes teorilektioner.
          </p>
        </div>
        <Link
          href="/hold/nyt"
          className="shrink-0 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          + Opret hold
        </Link>
      </div>

      {classes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          Ingen hold endnu — tryk “Opret hold” for at lave det første.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {classes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/hold/${c.id}`}
                className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:bg-neutral-50"
              >
                <span className="font-medium">{c.name}</span>
                {c.instructorName && (
                  <span className="mt-0.5 text-xs text-neutral-500">
                    {c.instructorName}
                  </span>
                )}
                <span className="mt-3 text-xs text-neutral-500">
                  {c.memberCount} elev{c.memberCount === 1 ? "" : "er"} ·{" "}
                  {c.sessionCount} teorigang
                  {c.sessionCount === 1 ? "" : "e"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
