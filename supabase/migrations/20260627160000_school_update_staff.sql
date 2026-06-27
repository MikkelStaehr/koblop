-- ============================================================================
-- Udvid skole-opdatering fra kun-admin til staff (admin + instructor).
--
-- I små køreskoler er kørelæreren ofte også "admin". Skoleoplysninger (navn) og
-- afbudsfrist (cancellation_window_hours) skal kunne sættes fra Indstillinger af
-- en kørelærer — konsistent med ressourcer og tilgængelighed, der allerede er
-- staff-skrivbare.
-- ============================================================================

drop policy if exists "school_update_admin" on schools;

create policy "school_update_staff" on schools
  for update to authenticated
  using (id = current_school_id() and current_user_role() in ('admin', 'instructor'))
  with check (id = current_school_id() and current_user_role() in ('admin', 'instructor'));
