import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import { listClasses } from "@/lib/queries/classes";
import CreateClassForm from "@/components/CreateClassForm";

export default async function HoldPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.profile?.role === "student") redirect("/");

  const classes = await listClasses();

  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="mb-1 text-2xl font-semibold">Hold</h1>
      <p className="mb-6 max-w-2xl text-sm text-neutral-500">
        Teorihold — fælles teoriundervisning som elever knyttes til. Opret en
        teorigang på holdet og kryds fremmøde af; det gennemfører elevernes
        teorilektioner.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">
            Nyt hold
          </h2>
          <CreateClassForm />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">
            Dine hold ({classes.length})
          </h2>
          {classes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
              Ingen hold endnu — opret det første til venstre.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
      </div>
    </div>
  );
}
