-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Aggiunge il concetto di entrata (stipendio, bonus, regalo...) accanto alle
-- spese già esistenti su payments, invece di creare una tabella separata:
-- stesso form, stessa condivisione per famiglia, stessa gestione ricorrenze.
--
-- "add column ... not null default" valorizza da solo anche le righe già
-- esistenti (tutte spese storiche → 'spesa', corretto), quindi non serve un
-- backfill separato come per family_id. Nessuna modifica alla RLS: le
-- policy già esistenti (payments_family_visibility_rls.sql +
-- payments_drop_legacy_policies.sql) sono agnostiche rispetto alle colonne.

alter table payments
  add column type text not null default 'spesa' check (type in ('spesa', 'entrata'));
