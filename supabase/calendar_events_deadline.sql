-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Aggiunge il tracking "scadenza / completata" agli eventi del calendario

alter table calendar_events
  add column is_deadline  boolean default false,
  add column completed    boolean default false,
  add column completed_at date;
