-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- STEP 1 del multi-tenant "famiglie": introduce le tabelle families/
-- family_members e le funzioni per creare una famiglia, chiedere di unirsi a
-- una famiglia esistente tramite codice invito, e per il leader approvare/
-- rifiutare/rimuovere membri. Non tocca calendar_events/loyalty_cards/
-- medicines: quello è uno step successivo (aggiunta di family_id + backfill
-- + cambio delle policy RLS), fatto solo dopo aver verificato che questo
-- flusso di onboarding funziona.
--
-- Tutte le operazioni "sensibili" (creare/unirsi/approvare/rifiutare/
-- rimuovere/rigenerare il codice) passano da funzioni SECURITY DEFINER
-- invece che da insert/update diretti del client sulle tabelle: così la
-- tabella non ha bisogno di policy permissive complesse (niente rischio di
-- un utente che si auto-approva o legge le richieste pending di un'altra
-- famiglia), e ogni funzione applica da sola i controlli di autorizzazione
-- (es. "sei leader della TUA famiglia?") usando auth.uid().

create table families (
  id              uuid default gen_random_uuid() primary key,
  name            text not null,
  invite_code     text not null unique,
  leader_user_id  uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now()
);

create table family_members (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  family_id     uuid not null references families(id) on delete cascade,
  role          text not null default 'member' check (role in ('leader', 'member')),
  status        text not null default 'pending' check (status in ('pending', 'approved')),
  requested_at  timestamptz not null default now(),
  approved_at   timestamptz
);

alter table families enable row level security;
alter table family_members enable row level security;

-- Fallback di lettura diretta (l'app normalmente passa dalle funzioni sotto,
-- ma è comunque corretto che un utente possa sempre vedere la propria riga
-- e la propria famiglia via select semplice).
create policy "members can view their own family"
  on families for select
  using (id in (select family_id from family_members where user_id = auth.uid() and status = 'approved'));

create policy "users can view their own membership row"
  on family_members for select
  using (user_id = auth.uid());

-- Tabella creata via SQL Editor: senza questo grant "authenticated" prende
-- "permission denied" anche con le policy corrette (stesso problema già
-- visto con medicines, vedi medicines_grants.sql).
grant select on public.families, public.family_members to authenticated;


-- ── Funzioni ─────────────────────────────────────────────────────

-- Codice invito breve e leggibile (es. "AB3K7Q"): niente 0/O/1/I per evitare
-- ambiguità quando viene letto/digitato a mano.
create or replace function generate_invite_code() returns text
language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from families where invite_code = code);
  end loop;
  return code;
end;
$$;

-- Crea una nuova famiglia e ne rende il chiamante leader (approvato subito).
-- Fallisce se il chiamante ha già una riga in family_members (una famiglia
-- sola per utente, per ora).
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

  return v_family;
end;
$$;

grant execute on function create_family(text) to authenticated;

-- Richiede di unirsi a una famiglia esistente tramite codice invito: crea
-- una riga 'pending', in attesa che il leader approvi. Restituisce il nome
-- della famiglia (per mostrare "richiesta inviata a <nome>" in UI).
create or replace function request_join_family(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_family_id uuid;
  v_family_name text;
begin
  if exists (select 1 from family_members where user_id = auth.uid()) then
    raise exception 'already_in_family';
  end if;

  select id, name into v_family_id, v_family_name
  from families where upper(invite_code) = upper(trim(p_code));

  if v_family_id is null then
    raise exception 'invalid_code';
  end if;

  insert into family_members (user_id, family_id, role, status)
  values (auth.uid(), v_family_id, 'member', 'pending');

  return v_family_name;
end;
$$;

grant execute on function request_join_family(text) to authenticated;

-- Stato di appartenenza del chiamante: nessuna riga = non ha ancora una
-- famiglia (né richieste in corso). invite_code è incluso per qualunque
-- membro approvato, non solo il leader: chiunque in famiglia può invitare.
create or replace function my_family_info()
returns table (
  status        text,
  role          text,
  family_id     uuid,
  family_name   text,
  invite_code   text
)
language sql security definer set search_path = public as $$
  select fm.status, fm.role, f.id, f.name, f.invite_code
  from family_members fm
  join families f on f.id = fm.family_id
  where fm.user_id = auth.uid();
$$;

grant execute on function my_family_info() to authenticated;

-- Elenco famiglia per il chiamante (deve essere un membro approvato): un
-- membro normale vede solo i membri approvati, il leader vede anche le
-- richieste pending da approvare/rifiutare.
create or replace function list_family_members()
returns table (user_id uuid, email text, role text, status text, requested_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_family_id uuid;
  v_is_leader boolean;
begin
  select fm.family_id, (fm.role = 'leader') into v_family_id, v_is_leader
  from family_members fm where fm.user_id = auth.uid() and fm.status = 'approved';

  if v_family_id is null then
    return;
  end if;

  return query
    select fm.user_id, u.email::text, fm.role, fm.status, fm.requested_at
    from family_members fm
    join auth.users u on u.id = fm.user_id
    where fm.family_id = v_family_id
      and (v_is_leader or fm.status = 'approved')
    order by fm.status desc, fm.role desc, fm.requested_at;
end;
$$;

grant execute on function list_family_members() to authenticated;

-- Solo il leader approvato della TUA famiglia può approvare/rifiutare/
-- rimuovere/rigenerare: ogni funzione ri-verifica da sé il ruolo, non si fida
-- di un flag mandato dal client.
create or replace function approve_member(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_family_id uuid;
begin
  select family_id into v_family_id
  from family_members where user_id = auth.uid() and role = 'leader' and status = 'approved';

  if v_family_id is null then raise exception 'not_a_leader'; end if;

  update family_members set status = 'approved', approved_at = now()
    where user_id = p_user_id and family_id = v_family_id and status = 'pending';
end;
$$;

grant execute on function approve_member(uuid) to authenticated;

create or replace function reject_member(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_family_id uuid;
begin
  select family_id into v_family_id
  from family_members where user_id = auth.uid() and role = 'leader' and status = 'approved';

  if v_family_id is null then raise exception 'not_a_leader'; end if;

  delete from family_members
    where user_id = p_user_id and family_id = v_family_id and status = 'pending';
end;
$$;

grant execute on function reject_member(uuid) to authenticated;

create or replace function remove_member(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_family_id uuid;
begin
  select family_id into v_family_id
  from family_members where user_id = auth.uid() and role = 'leader' and status = 'approved';

  if v_family_id is null then raise exception 'not_a_leader'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot_remove_self'; end if;

  delete from family_members
    where user_id = p_user_id and family_id = v_family_id and status = 'approved';
end;
$$;

grant execute on function remove_member(uuid) to authenticated;

-- Un membro normale può lasciare la famiglia in autonomia; il leader no (per
-- ora) per evitare di lasciare una famiglia orfana senza nessuno che approvi
-- nuove richieste — gestire "trasferisci leadership" è rimandato a dopo.
create or replace function leave_family() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
begin
  select role into v_role from family_members where user_id = auth.uid();
  if v_role = 'leader' then
    raise exception 'leader_cannot_leave';
  end if;
  delete from family_members where user_id = auth.uid();
end;
$$;

grant execute on function leave_family() to authenticated;

create or replace function regenerate_invite_code() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_family_id uuid;
  v_code text;
begin
  select family_id into v_family_id
  from family_members where user_id = auth.uid() and role = 'leader' and status = 'approved';

  if v_family_id is null then raise exception 'not_a_leader'; end if;

  v_code := generate_invite_code();
  update families set invite_code = v_code where id = v_family_id;
  return v_code;
end;
$$;

grant execute on function regenerate_invite_code() to authenticated;
