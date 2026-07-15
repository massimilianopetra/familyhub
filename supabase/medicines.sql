-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table medicines (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references auth.users(id) on delete cascade,
  person_name       text not null,
  medicine_name     text not null,
  dosage_note       text,                          -- es. "1 compressa da 500mg"
  unit_label        text not null default 'compresse',
  times_per_day     numeric not null default 1,    -- assunzioni al giorno
  units_per_intake  numeric not null default 1,    -- unità per assunzione
  stock_units       numeric not null default 0,    -- scorte registrate in stock_as_of
  stock_as_of       date not null default current_date, -- data in cui sono state contate
  is_active         boolean not null default true, -- terapia in corso
  start_date        date default current_date,
  end_date          date,
  notes             text,
  created_at        timestamp with time zone default now()
);

-- Row Level Security: tutti i membri della famiglia vedono le terapie di tutti
-- (il filtro "Solo mie" è lato interfaccia), ma solo chi le ha create può
-- modificarle/eliminarle (come tessere fedeltà ed eventi del calendario)
alter table medicines enable row level security;

create policy "Authenticated users can view medicines"
  on medicines for select
  using (auth.uid() is not null);

create policy "Users can insert their own medicines"
  on medicines for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own medicines"
  on medicines for update
  using (auth.uid() = user_id);

create policy "Users can delete their own medicines"
  on medicines for delete
  using (auth.uid() = user_id);

-- Necessario perché la tabella è creata via SQL Editor: senza questo grant di
-- base il ruolo "authenticated" riceve "permission denied" anche con le policy corrette.
grant select, insert, update, delete on public.medicines to authenticated;
