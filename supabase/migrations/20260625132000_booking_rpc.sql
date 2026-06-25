-- ============================================================================
-- Booking-hjælpere
-- ============================================================================
-- Elever må ikke se andre elevers bookinger (RLS), men skal kunne beregne
-- ledige tider. Denne security-definer-funktion returnerer KUN optagne
-- tidsintervaller (start/slut) for en lærer i samme skole — ingen elevdata.
-- Klienten trækker disse fra lærerens availability_rules for at vise ledige slots.
create or replace function public.instructor_busy(
  p_instructor uuid,
  p_from       timestamptz,
  p_to         timestamptz
)
returns table (start_at timestamptz, end_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.start_at, b.end_at
  from bookings b
  join profiles me on me.id = auth.uid()
  where b.instructor_id = p_instructor
    and b.status = 'booked'
    and b.school_id = me.school_id          -- kun samme skole
    and b.start_at < p_to
    and b.end_at   > p_from
$$;
