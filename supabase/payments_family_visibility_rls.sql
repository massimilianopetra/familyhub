-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Da lanciare SOLO dopo aver verificato con la query di controllo di
-- payments_family_id_backfill.sql che ogni riga di payments ha già la
-- family_id corretta (senza_famiglia = 0).
--
-- Rende family_id obbligatoria su payments e sostituisce la policy RLS
-- "solo il proprietario vede/gestisce" con: la famiglia vede tutti i
-- pagamenti (come già previsto lato UI — toggle "Solo miei" e badge
-- "👤 Famiglia" in PaymentsScreen.jsx), ma solo il proprietario può
-- inserire/modificare/eliminare le proprie righe. A differenza di
-- calendar_events/loyalty_cards/medicines, payments resta l'unica tabella
-- dove i dati economici non condivisibili (nessuno vede l'importo di un
-- pagamento inserito da un altro membro senza che sia nella stessa
-- famiglia) — qui però la condivisione in lettura è quella richiesta, non
-- più "fully private".

-- 1) family_id obbligatoria: sicuro, il backfill copre già ogni riga.
alter table payments alter column family_id set not null;

-- 2) Rimuove la policy esistente (nome noto, payments.sql l'ha creata
-- esplicitamente, a differenza di calendar_events/loyalty_cards).
drop policy if exists "Users can manage their own payments" on payments;

-- 3) Nuove policy, stesso schema di calendar_events/loyalty_cards/medicines:
-- select   → chiunque nella STESSA famiglia vede la riga
-- insert   → solo se sei tu il creatore E la riga è della TUA famiglia
--            (current_family_id() lo ricalcola lato server da auth.uid(),
--            non ci si fida di un family_id mandato dal client)
-- update   → solo il creatore, e solo se la riga è ancora nella sua famiglia
-- delete   → solo il creatore

create policy "family can view payments"
  on payments for select using (family_id = current_family_id());
create policy "owner can insert own payments"
  on payments for insert with check (auth.uid() = user_id and family_id = current_family_id());
create policy "owner can update own payments"
  on payments for update
  using (auth.uid() = user_id and family_id = current_family_id())
  with check (auth.uid() = user_id and family_id = current_family_id());
create policy "owner can delete own payments"
  on payments for delete using (auth.uid() = user_id);
