-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Categorie spese/entrate personalizzabili per famiglia (creare/modificare/
-- disattivare categorie custom oltre a quelle generiche, es. "Iren",
-- "Telepass", "Mercato"). Invece di tenere EXPENSE_CATEGORIES/
-- INCOME_CATEGORIES in src/utils/paymentTypes.js come unica fonte a runtime e
-- salvare in tabella solo le eccezioni, questa tabella diventa la fonte di
-- verità completa: ogni famiglia ha la propria copia di righe (seedata dai
-- default sotto), così "modifica" è un'operazione uniforme su qualunque
-- riga, senza dover distinguere "è un default" da "è custom". paymentTypes.js
-- resta solo il seed iniziale, non è più letto dal form una volta caricate
-- le categorie di famiglia (vedi PaymentsScreen.jsx).
--
-- payments.category resta testo libero, non FK verso questa tabella:
-- disattivare o rinominare una categoria non tocca i movimenti già salvati,
-- che restano con la stringa storica — scelta deliberata per non dover fare
-- update di massa su payments ogni volta che si tocca l'elenco categorie.
-- "Eliminare" una categoria dalla UI è quindi sempre e solo is_active=false,
-- mai un delete reale (la RLS lo permetterebbe comunque, per completezza).

create table payment_categories (
  id         uuid default gen_random_uuid() primary key,
  family_id  uuid not null default current_family_id() references families(id),
  type       text not null check (type in ('spesa', 'entrata')),
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Evita duplicati case-insensitive nella stessa famiglia/tipo (es. "Iren" e
-- "iren"); serve un indice, non un vincolo unique inline, perché usa
-- un'espressione (lower(name)).
create unique index payment_categories_family_type_name_idx
  on payment_categories (family_id, type, lower(name));

alter table payment_categories enable row level security;

-- Tassonomia condivisa di famiglia, non dato personale: a differenza di
-- payments/calendar_events/loyalty_cards/medicines (dove update/delete sono
-- riservati al creatore), qui QUALSIASI membro approvato della famiglia può
-- creare/rinominare/disattivare — deviazione voluta dal pattern owner-only
-- usato altrove in questo schema.
create policy "family can view payment_categories"
  on payment_categories for select using (family_id = current_family_id());
create policy "family can insert payment_categories"
  on payment_categories for insert with check (family_id = current_family_id());
create policy "family can update payment_categories"
  on payment_categories for update
  using (family_id = current_family_id())
  with check (family_id = current_family_id());
create policy "family can delete payment_categories"
  on payment_categories for delete using (family_id = current_family_id());

-- Tabella creata via SQL Editor: senza questo grant "authenticated" prende
-- "permission denied" anche con le policy corrette (stesso problema già
-- visto con medicines, vedi medicines_grants.sql).
grant select, insert, update, delete on public.payment_categories to authenticated;

-- Seed: ogni famiglia già esistente riceve una copia delle categorie oggi
-- hardcoded in EXPENSE_CATEGORIES/INCOME_CATEGORIES (src/utils/paymentTypes.js).
-- Le famiglie create DOPO questo script vengono seedate da create_family()
-- stessa, vedi payment_categories_seed_on_create_family.sql (da eseguire
-- subito dopo questo file).
insert into payment_categories (family_id, type, name)
select f.id, 'spesa', c.name
from families f
cross join (values
  ('Tasse'), ('Tassa Rifiuti'), ('IMU'), ('Bollo Auto'), ('SMAT'), ('Luce'),
  ('Gas'), ('Acqua'), ('Internet'), ('Mutuo/Affitto'), ('Bolletta'),
  ('Assicurazione'), ('Auto/Trasporti'), ('Salute'), ('Svago/Divertimenti'),
  ('Altro')
) as c(name);

insert into payment_categories (family_id, type, name)
select f.id, 'entrata', c.name
from families f
cross join (values ('Stipendio'), ('Bonus'), ('Regalo'), ('Altro')) as c(name);
