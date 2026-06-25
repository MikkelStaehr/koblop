import type { StudentModuleRow } from "@/lib/queries/dashboard";
import { MODULE_STATUS_LABEL } from "@/lib/domain";

const STATUS_DOT: Record<string, string> = {
  laast: "bg-neutral-300",
  i_gang: "bg-blue-500",
  afventer_godkendelse: "bg-amber-400",
  gennemfoert: "bg-emerald-500",
};

export default function ModuleTimeline({
  modules,
}: {
  modules: StudentModuleRow[];
}) {
  return (
    <ol className="flex flex-col gap-2">
      {modules.map((m) => {
        const locked = m.status === "laast";
        return (
          <li
            key={m.order}
            className={`rounded-xl border p-3 ${
              locked
                ? "border-neutral-200 bg-neutral-50 opacity-70"
                : "border-neutral-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[m.status]}`}
              />
              <span className="font-medium">{m.title}</span>
              <span className="ml-auto text-xs text-neutral-500">
                {MODULE_STATUS_LABEL[m.status]}
              </span>
            </div>
            <div className="mt-2 flex gap-4 pl-4 text-xs text-neutral-500">
              <span>
                Teori {m.theoryDone}/{m.theoryTotal}
              </span>
              <span>
                Køretimer {m.praksisDone}/{m.praksisTotal}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
