-- Fix: ved INSERT skal kun en aktiv booking ('booked') markere lektionen
-- som 'planlagt'. En booking oprettet som 'cancelled' må ikke ændre lektionen.
create or replace function public.sync_lesson_on_booking()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'booked' then
      update lesson_progress
      set status = 'planlagt', scheduled_at = new.start_at
      where id = new.lesson_id and status = 'ikke_planlagt';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
      update lesson_progress
      set status = 'ikke_planlagt', scheduled_at = null
      where id = new.lesson_id and status = 'planlagt';
    elsif new.status = 'completed' and old.status is distinct from 'completed' then
      update lesson_progress
      set status = 'gennemfoert', completed_at = now()
      where id = new.lesson_id;
    end if;
  end if;
  return new;
end;
$$;
