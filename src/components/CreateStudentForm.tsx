"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { createStudent } from "@/lib/actions/students";

export default function CreateStudentForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState("");
  const [copied, setCopied] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLink(null);
    startTransition(async () => {
      const r = await createStudent({ fullName, email, phone });
      if (r.ok) {
        setMsg({ ok: true, text: `${fullName} oprettet og forløb (kat. B) klar.` });
        setLink(r.loginLink ?? null);
        setCreatedEmail(email);
        setFullName("");
        setEmail("");
        setPhone("");
        setOpen(false);
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error ?? "Noget gik galt." });
      }
    });
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => {
            setOpen(true);
            setMsg(null);
            setLink(null);
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          <UserPlus className="h-4 w-4" />
          Opret elev
        </button>
        {msg?.ok && (
          <div className="flex max-w-xl flex-col gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            <span>{msg.text}</span>
            {link ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-emerald-700">
                  Send dette login-link til eleven:
                </span>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.target.select()}
                    className="min-w-0 flex-1 rounded border border-emerald-200 bg-white px-2 py-1 text-xs text-neutral-700"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(link);
                      setCopied(true);
                    }}
                    className="shrink-0 rounded border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                  >
                    {copied ? "Kopieret ✓" : "Kopiér"}
                  </button>
                </div>
              </div>
            ) : (
              <span className="text-xs text-emerald-700">
                Bed eleven logge ind via magisk link på login-siden med{" "}
                {createdEmail}.
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex max-w-xl flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4"
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-1 flex-col gap-1 text-xs text-neutral-500">
          Navn
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Elevens fulde navn"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs text-neutral-500">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="elev@eksempel.dk"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Telefon (valgfrit)
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="12 34 56 78"
            className="w-36 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black"
          />
        </label>
      </div>

      <p className="text-xs text-neutral-400">
        Eleven oprettes med forløb (kategori B), og du får et login-link at sende
        videre. Eleven kan også logge ind via magisk link på login-siden.
      </p>

      {msg && !msg.ok && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {msg.text}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Opretter…" : "Opret og inviter"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setMsg(null);
          }}
          disabled={pending}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-50 disabled:opacity-50"
        >
          Annuller
        </button>
      </div>
    </form>
  );
}
