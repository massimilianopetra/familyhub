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
  visible_to_all    boolean not null default false, -- condivisa in sola lettura con la famiglia
  start_date        date default current_date,
  end_date          date,
  notes             text,
  created_at        timestamp with time zone default now()
);

-- Row Level Security: ogni terapia è privata di chi la crea, a meno che non
-- venga condivisa (visible_to_all); solo chi l'ha creata può modificarla/eliminarla
alter table medicines enable row level security;

create policy "Users can view own or shared medicines"
  on medicines for select
  using (auth.uid() = user_id or visible_to_all = true);

create policy "Users can insert their own medicines"
  on medicines for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own medicines"
  on medicines for update
  using (auth.uid() = user_id);

create policy "Users can delete their own medicines"
  on medicines for delete
  using (auth.uid() = user_id);
