import type { MessageItem } from "@/lib/queries/dashboard";
import Avatar from "@/components/Avatar";

export default function MessagesBox({ messages }: { messages: MessageItem[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-700">Beskeder</h2>
      {messages.length === 0 ? (
        <p className="text-sm text-neutral-400">Ingen beskeder.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {messages.map((m) => (
            <li key={m.id} className="flex gap-2.5">
              <Avatar initials={m.initials} name={m.sender} />
              <div className="min-w-0 text-sm">
                <span className="font-medium">{m.sender}:</span> {m.body}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
