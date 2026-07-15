-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Ogni terapia è privata per chi la crea; questo flag permette di renderla
-- visibile (sola lettura) anche agli altri utenti della famiglia.

alter table medicines
  add column visible_to_all boolean not null default false;

-- Sostituisce la policy di select precedente (visibile a chiunque loggato)
drop policy if exists "Authenticated users can view medicines" on medicines;

create policy "Users can view own or shared medicines"
  on medicines for select
  using (auth.uid() = user_id or visible_to_all = true);
