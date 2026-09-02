-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Da lanciare dopo payments_family_visibility_rls.sql.
--
-- payments_family_visibility_rls.sql ha droppato "Users can manage their own
-- payments" (l'unica policy nota, dichiarata in payments.sql) e creato le 4
-- policy corrette scoped per famiglia. Ma su payments esistevano ANCHE altre
-- 4 policy create a mano nel dashboard in un momento non tracciato nel repo,
-- rimaste attive in parallelo:
--   - "Authenticated users can read payments" (select, auth.uid() is not null)
--     → qualunque utente loggato leggeva TUTTI i pagamenti, di ogni famiglia.
--     Essendo una policy permissive aggiuntiva sullo stesso comando SELECT,
--     Postgres la univa in OR con "family can view payments", vanificandola:
--     è la causa per cui "Solo miei" disattivato mostrava pagamenti di
--     famiglie diverse dalla propria.
--   - "Users can delete/insert/update own payments" (auth.uid() = user_id,
--     nessun controllo su family_id) → duplicati meno restrittivi delle
--     "owner can insert/update/delete own payments" appena create: per
--     insert/update non controllavano family_id nel with_check, quindi un
--     client avrebbe potuto scrivere una riga con family_id di un'altra
--     famiglia bypassando il controllo appena introdotto.
--
-- Le rimuove tutte, lasciando solo le 4 policy scoped per famiglia create da
-- payments_family_visibility_rls.sql.

drop policy if exists "Authenticated users can read payments" on payments;
drop policy if exists "Users can delete own payments" on payments;
drop policy if exists "Users can insert own payments" on payments;
drop policy if exists "Users can update own payments" on payments;

-- ── Verifica (esegui a parte dopo) ──────────────────────────────────────────
-- Deve restare SOLO: "family can view payments", "owner can insert/update/
-- delete own payments".
--
-- select policyname, cmd, qual, with_check from pg_policies where tablename = 'payments';
