-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Permette lo scarico automatico delle scorte: salva la data in cui è stata
-- registrata la quantità, così l'app calcola da sola quante ne restano oggi
-- in base al consumo previsto.

alter table medicines
  add column stock_as_of date not null default current_date;
