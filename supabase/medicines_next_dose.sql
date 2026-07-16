-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Ripensamento: la colonna "next_dose_date" (aggiunta in una versione
-- precedente di questo file) viene abbandonata a favore della colonna
-- "start_date" già esistente in tabella, che diventa l'ancoraggio da cui
-- l'app calcola la prossima dose facendola avanzare di "dose_interval_days"
-- ogni volta che quella salvata passa (calcolo a runtime, come
-- currentStock(), nessuna scrittura automatica). Se dose_interval_days è
-- vuoto si assume 1 (assunzione giornaliera).

alter table medicines
  drop column if exists next_dose_date,
  add column dose_interval_days numeric;
