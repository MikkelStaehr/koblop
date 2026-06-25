import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getBookingOptions } from "@/lib/queries/booking";
import BookingSlots from "@/components/BookingSlots";

export default async function BookPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.profile?.role !== "student") redirect("/");

  const opts = await getBookingOptions(ctx.userId);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">Book køretime</h1>
      {opts.lesson ? (
        <>
          <p className="mb-5 text-sm text-neutral-500">
            {opts.lesson.moduleTitle} · Køretime {opts.lesson.lessonNo} — vælg en
            ledig tid hos din kørelærer.
          </p>
          <BookingSlots lessonId={opts.lesson.id} days={opts.days} />
        </>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          {opts.reason}
        </p>
      )}
    </div>
  );
}
