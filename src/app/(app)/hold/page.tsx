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
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Hold</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Teorihold — fælles teoriundervisning som elever knyttes til. Opret en
        teorigang på holdet og kryds fremmøde af; det gennemfører elevernes
        teorilektioner.
      </p>

      <div className="mb-6 max-w-xl">
        <CreateClassForm />
      </div>

      {classes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          Ingen hold endnu — opret det første ovenfor.
        </p>
      ) : (
        <ul className="flex max-w-xl flex-col gap-2">
          {classes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/hold/${c.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-neutral-300 hover:bg-neutral-50"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-neutral-500">
                    {c.memberCount} elev{c.memberCount === 1 ? "" : "er"} ·{" "}
                    {c.sessionCount} teorigang
                    {c.sessionCount === 1 ? "" : "e"}
                  </span>
                </div>
                {c.instructorName && (
                  <div className="mt-1 text-xs text-neutral-500">
                    {c.instructorName}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
