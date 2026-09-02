-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- STEP 2 del multi-tenant "famiglie": aggiunge family_id a calendar_events,
-- loyalty_cards, medicines e lo valorizza per le righe già esistenti,
-- deducendolo dalla famiglia di chi le ha create (family_members.user_id).
--
-- Non cambia NESSUNA policy RLS: tutti gli utenti autenticati continuano a
-- vedere tutto come prima (esattamente come oggi). È deliberato — prima si
-- verifica che il backfill sia completo e corretto con la query in fondo a
-- questo file, poi (solo dopo, in un file separato) si passa allo Step 3 che
-- restringe le policy per famiglia e rende family_id obbligatorio.

-- 1) Colonna nullable, così l'aggiunta non fallisce sulle righe esistenti
alter table calendar_events add column family_id uuid references families(id);
alter table loyalty_cards   add column family_id uuid references families(id);
alter table medicines       add column family_id uuid references families(id);

-- 2) Famiglia approvata del chiamante (null se non ne ha una). Usata sia come
-- default colonna per i nuovi insert (così il codice React, che oggi non
-- manda family_id, non va toccato), sia nello Step 3 dentro le policy RLS.
create or replace function current_family_id() returns uuid
language sql stable security definer set search_path = public as $$
  select family_id from family_members
  where user_id = auth.uid() and status = 'approved'
  limit 1;
$$;

grant execute on function current_family_id() to authenticated;

-- 3) Da qui in poi, ogni nuova riga inserita si autoassegna alla famiglia di
-- chi la crea.
alter table calendar_events alter column family_id set default current_family_id();
alter table loyalty_cards   alter column family_id set default current_family_id();
alter table medicines       alter column family_id set default current_family_id();

-- 4) Backfill delle righe già esistenti, dedotto da chi le ha create.
update calendar_events ce set family_id = fm.family_id
  from family_members fm where fm.user_id = ce.user_id and ce.family_id is null;

update loyalty_cards lc set family_id = fm.family_id
  from family_members fm where fm.user_id = lc.user_id and lc.family_id is null;

update medicines m set family_id = fm.family_id
  from family_members fm where fm.user_id = m.user_id and m.family_id is null;


-- ── Verifica (esegui a parte dopo, non fa parte della migrazione) ──────────
-- "senza_famiglia" deve essere 0 su tutte e tre le righe. Se non lo è,
-- quella riga ha uno user_id che non compare (ancora) in family_members —
-- non procedere allo Step 3 finché non è 0 ovunque.
--
-- select 'calendar_events' as tabella, count(*) filter (where family_id is null) as senza_famiglia, count(*) as totale from calendar_events
-- union all
-- select 'loyalty_cards', count(*) filter (where family_id is null), count(*) from loyalty_cards
-- union all
-- select 'medicines', count(*) filter (where family_id is null), count(*) from medicines;
