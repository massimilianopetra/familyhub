-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- STEP 3 (il più delicato) del multi-tenant "famiglie": rende family_id
-- obbligatoria su calendar_events/loyalty_cards/medicines e sostituisce le
-- loro policy RLS da "tutti gli autenticati vedono tutto" a "solo la propria
-- famiglia". Da lanciare SOLO dopo aver verificato con la query di controllo
-- di family_id_backfill.sql che ogni riga di tutte e tre le tabelle ha già
-- la family_id corretta (verificato: 36/36 calendar_events, 34/34
-- loyalty_cards, 12/12 medicines — nessuna riga fuori posto).
--
-- Da questo momento chi non appartiene alla tua famiglia (es. l'account di
-- test fake@familyhub.it) non vede più i tuoi dati, e tu non vedi i suoi.
-- Tutto lo script gira in un'unica transazione implicita: se una riga
-- fallisse andrebbe tutto in rollback, non si resta mai a metà.

-- 1) family_id obbligatoria: sicuro, il backfill copre già ogni riga.
alter table calendar_events alter column family_id set not null;
alter table loyalty_cards   alter column family_id set not null;
alter table medicines       alter column family_id set not null;

-- 2) Rimuove TUTTE le policy esistenti sulle tre tabelle, qualunque sia il
-- loro nome esatto (calendar_events/loyalty_cards sono state create da
-- dashboard: non conosciamo i nomi precisi delle policy attuali) per
-- ripartire puliti invece di indovinare cosa c'è già.
do $$
declare
  pol record;
  tbl text;
begin
  foreach tbl in array array['calendar_events', 'loyalty_cards', 'medicines'] loop
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = tbl loop
      execute format('drop policy %I on public.%I', pol.policyname, tbl);
    end loop;
  end loop;
end $$;

-- 3) Nuove policy, stesso schema per tutte e tre le tabelle:
-- select   → chiunque nella STESSA famiglia vede la riga (era: chiunque
--            autenticato, ora ristretto)
-- insert   → solo se sei tu il creatore E la riga è della TUA famiglia
--            (current_family_id() lo ricalcola lato server da auth.uid(),
--            non ci si fida di un family_id mandato dal client)
-- update   → solo il creatore, e solo se la riga è ancora nella sua famiglia
-- delete   → solo il creatore

create policy "family can view calendar_events"
  on calendar_events for select using (family_id = current_family_id());
create policy "owner can insert own calendar_events"
  on calendar_events for insert with check (auth.uid() = user_id and family_id = current_family_id());
create policy "owner can update own calendar_events"
  on calendar_events for update
  using (auth.uid() = user_id and family_id = current_family_id())
  with check (auth.uid() = user_id and family_id = current_family_id());
create policy "owner can delete own calendar_events"
  on calendar_events for delete using (auth.uid() = user_id);

create policy "family can view loyalty_cards"
  on loyalty_cards for select using (family_id = current_family_id());
create policy "owner can insert own loyalty_cards"
  on loyalty_cards for insert with check (auth.uid() = user_id and family_id = current_family_id());
create policy "owner can update own loyalty_cards"
  on loyalty_cards for update
  using (auth.uid() = user_id and family_id = current_family_id())
  with check (auth.uid() = user_id and family_id = current_family_id());
create policy "owner can delete own loyalty_cards"
  on loyalty_cards for delete using (auth.uid() = user_id);

create policy "family can view medicines"
  on medicines for select using (family_id = current_family_id());
create policy "owner can insert own medicines"
  on medicines for insert with check (auth.uid() = user_id and family_id = current_family_id());
create policy "owner can update own medicines"
  on medicines for update
  using (auth.uid() = user_id and family_id = current_family_id())
  with check (auth.uid() = user_id and family_id = current_family_id());
create policy "owner can delete own medicines"
  on medicines for delete using (auth.uid() = user_id);
