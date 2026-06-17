-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table payments (
  id                   uuid default gen_random_uuid() primary key,
  user_id              uuid references auth.users(id) on delete cascade,
  title                text not null,
  amount               numeric(10,2) not null,
  category             text not null,
  -- Categorie supportate: Tasse, IMU, Bollo Auto, SMAT, Luce, Gas, Acqua,
  --                       Internet, Mutuo/Affitto, Bolletta, Altro
  paid_at              date not null,
  is_recurring         boolean default false,
  recurrence_interval  text,    -- 'monthly' | 'quarterly' | 'yearly'
  next_due_date        date,
  notes                text,
  created_at           timestamp with time zone default now()
);

-- Row Level Security: ogni utente vede e gestisce solo i propri pagamenti
alter table payments enable row level security;

create policy "Users can manage their own payments"
  on payments for all
  using (auth.uid() = user_id);
