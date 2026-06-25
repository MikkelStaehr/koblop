"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "magic";

export default function LoginPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      setMsg(error ? error.message : "Tjek din mail for et login-link.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setMsg(error.message);
      else location.href = "/";
    }
    setLoading(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Driwe</h1>
        <p className="text-sm text-neutral-500">Log ind på din konto</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-3 text-base"
        />
        {mode === "password" && (
          <input
            type="password"
            required
            placeholder="Adgangskode"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-3 text-base"
          />
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black px-3 py-3 font-medium text-white disabled:opacity-50"
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
    </main>
  );
}
