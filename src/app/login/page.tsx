"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

type Mode = "password" | "magic";

// Demo-konti fra seed-scriptet (npm run seed:demo). Kun til demo/test.
const DEMO = {
  laerer: { email: "laerer@koblop.test", password: "123!" },
  elev: { email: "anna@koblop.test", password: "123!" },
};

export default function LoginPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function passwordLogin(em: string, pw: string) {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: em,
      password: pw,
    });
    if (error) {
      setMsg(error.message);
      setLoading(false);
    } else {
      location.href = "/";
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "magic") {
      setLoading(true);
      setMsg(null);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      setMsg(error ? error.message : "Tjek din mail for et login-link.");
      setLoading(false);
    } else {
      await passwordLogin(email, password);
    }
  }

  async function demoLogin(role: "laerer" | "elev") {
    const c = DEMO[role];
    setEmail(c.email);
    setPassword(c.password);
    await passwordLogin(c.email, c.password);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex w-full max-w-md flex-col gap-10">
        <div>
          <Logo className="text-7xl sm:text-8xl" />
          <p className="mt-3 text-lg text-neutral-500">Log ind på din konto</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3 text-left">
          <input
            type="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-neutral-300 px-4 py-4 text-lg"
          />
          {mode === "password" && (
            <input
              type="password"
              required
              placeholder="Adgangskode"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-neutral-300 px-4 py-4 text-lg"
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-black px-4 py-4 text-lg font-medium text-white disabled:opacity-50"
          >
            {loading
              ? "Vent…"
              : mode === "password"
                ? "Log ind"
                : "Send login-link"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "password" ? "magic" : "password")}
          className="text-sm text-neutral-500 underline"
        >
          {mode === "password"
            ? "Brug login-link i stedet (magic link)"
            : "Brug adgangskode i stedet"}
        </button>

        {msg && <p className="text-sm text-neutral-700">{msg}</p>}

        <div className="border-t border-neutral-200 pt-6">
          <p className="mb-3 text-xs uppercase tracking-wide text-neutral-400">
            Demo-login
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => demoLogin("laerer")}
              disabled={loading}
              className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              Kørelærer
            </button>
            <button
              type="button"
              onClick={() => demoLogin("elev")}
              disabled={loading}
              className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              Elev
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
