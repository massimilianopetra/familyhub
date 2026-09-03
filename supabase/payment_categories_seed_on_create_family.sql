-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Da eseguire DOPO payment_categories.sql.
--
-- Estende create_family() (definita in families.sql) perché una famiglia
-- creata da qui in avanti nasca già con le categorie di default, invece di
-- ritrovarsi con l'elenco categorie vuoto finché qualcuno non ne aggiunge una
-- a mano. Stessa lista di payment_categories.sql (che ha già seedato le
-- famiglie esistenti al momento di quello script).
--
-- "create or replace" ridefinisce solo il corpo della funzione: i permessi
-- già concessi con "grant execute on function create_family(text)" in
-- families.sql restano validi, non serve ri-concederli.

create or replace function create_family(p_name text) returns families
language plpgsql security definer set search_path = public as $$
declare
  v_family families;
begin
  if exists (select 1 from family_members where user_id = auth.uid()) then
    raise exception 'already_in_family';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'invalid_name';
  end if;

  insert into families (name, invite_code, leader_user_id)
  values (trim(p_name), generate_invite_code(), auth.uid())
  returning * into v_family;

  insert into family_members (user_id, family_id, role, status, approved_at)
  values (auth.uid(), v_family.id, 'leader', 'approved', now());

  insert into payment_categories (family_id, type, name) values
    (v_family.id, 'spesa', 'Tasse'), (v_family.id, 'spesa', 'Tassa Rifiuti'),
    (v_family.id, 'spesa', 'IMU'), (v_family.id, 'spesa', 'Bollo Auto'),
    (v_family.id, 'spesa', 'SMAT'), (v_family.id, 'spesa', 'Luce'),
    (v_family.id, 'spesa', 'Gas'), (v_family.id, 'spesa', 'Acqua'),
    (v_family.id, 'spesa', 'Internet'), (v_family.id, 'spesa', 'Mutuo/Affitto'),
    (v_family.id, 'spesa', 'Bolletta'), (v_family.id, 'spesa', 'Assicurazione'),
    (v_family.id, 'spesa', 'Auto/Trasporti'), (v_family.id, 'spesa', 'Salute'),
    (v_family.id, 'spesa', 'Svago/Divertimenti'), (v_family.id, 'spesa', 'Altro'),
    (v_family.id, 'entrata', 'Stipendio'), (v_family.id, 'entrata', 'Bonus'),
    (v_family.id, 'entrata', 'Regalo'), (v_family.id, 'entrata', 'Altro');

  return v_family;
end;
$$;
