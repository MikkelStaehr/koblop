-- ============================================================================
-- messages — simple skole-beskeder (til "Beskeder"-boksen på dashboardet)
-- ============================================================================
-- Minimal model: en besked hører til en skole og har en afsender. Alle i skolen
-- kan læse (broadcast/feed-stil); afsender kan oprette. Udvides senere med
-- modtager/tråde/læst-status hvis vi vil have egentlige 1-til-1-beskeder.

create table messages (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  sender_id  uuid references profiles(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index messages_school_idx on messages(school_id, created_at desc);

alter table messages enable row level security;

create policy "messages_select" on messages
  for select to authenticated
  using (school_id = current_school_id());

create policy "messages_insert" on messages
  for insert to authenticated
  with check (school_id = current_school_id() and sender_id = auth.uid());
