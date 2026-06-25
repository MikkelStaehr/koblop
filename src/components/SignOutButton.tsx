"use client";

import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    location.href = "/login";
  }
  return (
    <button
      onClick={signOut}
      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
    >
      Log ud
    </button>
  );
}
