-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Estende il multi-tenant "famiglie" ai pagamenti: aggiunge family_id a
-- payments e lo valorizza per le righe già esistenti, deducendolo dalla
-- famiglia di chi le ha create (family_members.user_id) — stesso schema di
-- family_id_backfill.sql (calendar_events/loyalty_cards/medicines).
--
-- Non cambia la policy RLS di payments: resta "solo il proprietario vede/
-- gestisce" come oggi. È deliberato — prima si verifica che il backfill sia
-- completo e corretto con la query in fondo a questo file, poi (solo dopo,
-- in un file separato) si passa a payments_family_visibility_rls.sql che
-- apre la lettura alla famiglia mantenendo scrittura solo al proprietario.
--
-- current_family_id() è già stata creata da family_id_backfill.sql: non va
-- ridefinita qui.

-- 1) Colonna nullable, così l'aggiunta non fallisce sulle righe esistenti
alter table payments add column family_id uuid references families(id);

-- 2) Da qui in poi, ogni nuovo pagamento inserito si autoassegna alla
-- famiglia di chi lo crea (il codice React non manda family_id, non va toccato).
alter table payments alter column family_id set default current_family_id();

-- 3) Backfill delle righe già esistenti, dedotto da chi le ha create.
update payments p set family_id = fm.family_id
  from family_members fm where fm.user_id = p.user_id and p.family_id is null;


-- ── Verifica (esegui a parte dopo, non fa parte della migrazione) ──────────
-- "senza_famiglia" deve essere 0. Se non lo è, quella riga ha uno user_id
-- che non compare (ancora) in family_members — non procedere a
-- payments_family_visibility_rls.sql finché non è 0.
--
-- select count(*) filter (where family_id is null) as senza_famiglia, count(*) as totale from payments;
