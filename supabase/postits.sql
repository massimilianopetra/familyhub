-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Post-it: note/promemoria senza data, condivise nella famiglia (visibili a
-- tutti come calendar_events/loyalty_cards/medicines/payments) ma modificabili
-- solo da chi le ha create. Nasce già con family_id (il pattern "current" per
-- una tabella nuova: niente backfill in due tempi come per le prime tre
-- tabelle, qui non esistono righe legacy da migrare).

create table postits (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade default auth.uid(),
  family_id   uuid not null references families(id) default current_family_id(),
  content     text not null,
  color       text not null default '#fef08a', -- sfondo "post-it": giallo di default
  created_at  timestamp with time zone default now(),
  updated_at  timestamp with time zone default now()
);

-- Limite di 10 post-it per persona (non per famiglia): ogni membro può averne
-- al più 10 propri. Controllato anche lato server (oltre che lato UI, che
-- nasconde "+ Aggiungi" quando il proprio conteggio arriva a 10) perché la UI
-- da sola è solo un aiuto, non un vincolo.
create or replace function enforce_postit_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from postits where user_id = new.user_id) >= 10 then
    raise exception 'Limite di 10 post-it per persona raggiunto';
  end if;
  return new;
end;
$$;

create trigger postits_limit_check
  before insert on postits
  for each row execute function enforce_postit_limit();

-- updated_at aggiornato automaticamente ad ogni modifica del contenuto/colore.
create or replace function touch_postit_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger postits_touch_updated_at
  before update on postits
  for each row execute function touch_postit_updated_at();

-- Row Level Security: stesso schema di calendar_events/loyalty_cards/medicines
-- (vedi supabase/family_visibility_rls.sql) — select condivisa in famiglia,
-- insert/update/delete solo dal creatore, family_id ricalcolato lato server.
alter table postits enable row level security;

create policy "family can view postits"
  on postits for select using (family_id = current_family_id());
create policy "owner can insert own postits"
  on postits for insert with check (auth.uid() = user_id and family_id = current_family_id());
create policy "owner can update own postits"
  on postits for update
  using (auth.uid() = user_id and family_id = current_family_id())
  with check (auth.uid() = user_id and family_id = current_family_id());
create policy "owner can delete own postits"
  on postits for delete using (auth.uid() = user_id);

-- Necessario perché la tabella è creata via SQL Editor: senza questo grant di
-- base il ruolo "authenticated" riceve "permission denied" anche con le policy corrette.
grant select, insert, update, delete on public.postits to authenticated;
