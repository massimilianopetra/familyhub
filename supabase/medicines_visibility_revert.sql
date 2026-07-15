-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Ripristina la condivisione totale delle terapie (come calendario/tessere fedeltà):
-- il filtro "Solo mie / Tutte" resta solo lato interfaccia, non più a livello di riga.
-- Sicuro da eseguire anche se medicines_visibility.sql non era mai stato applicato.

drop policy if exists "Users can view own or shared medicines" on medicines;
drop policy if exists "Authenticated users can view medicines" on medicines;

create policy "Authenticated users can view medicines"
  on medicines for select
  using (auth.uid() is not null);

alter table medicines drop column if exists visible_to_all;
