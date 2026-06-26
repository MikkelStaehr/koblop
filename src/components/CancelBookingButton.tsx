"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelBooking } from "@/lib/actions/booking";

export default function CancelBookingButton({
  bookingId,
}: {
  bookingId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setError(null);
    startTransition(async () => {
      const r = await cancelBooking(bookingId);
      if (r.ok) {
        router.refresh();
      } else {
        setError(r.error ?? "Kunne ikke aflyse.");
        setConfirming(false);
      }
    });
  }

  if (error) {
    return (
      <span className="max-w-[12rem] text-right text-xs text-red-600">
        {error}
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-neutral-400 transition hover:text-red-600"
      >
        Aflys
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-xs">
      <button
        onClick={cancel}
        disabled={pending}
        className="font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50"
      >
        {pending ? "Aflyser…" : "Bekræft"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="text-neutral-400 transition hover:text-neutral-600"
      >
        Fortryd
      </button>
    </span>
  );
}
