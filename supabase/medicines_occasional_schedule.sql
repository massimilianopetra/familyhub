-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Aggiunge un terzo tipo di posologia oltre a "ogni N giorni" e "giorni della
-- settimana": 'occasional' ("Al bisogno"), per terapie ad uso saltuario senza
-- uno schema fisso (es. antidolorifico preso solo quando serve). Per queste
-- schedule_type = 'occasional' non richiede né dose_interval_days né
-- weekdays: le scorte non scalano mai in automatico col passare del tempo
-- (dailyConsumption = 0 lato app), l'unico modo per farle scendere è il
-- bottone "➖ Consumo" nell'interfaccia.

alter table medicines
  drop constraint medicines_schedule_type_check;

alter table medicines
  add constraint medicines_schedule_type_check
    check (schedule_type in ('interval', 'weekdays', 'occasional'));

alter table medicines
  drop constraint medicines_schedule_check;

alter table medicines
  add constraint medicines_schedule_check check (
    (schedule_type = 'interval' and dose_interval_days is not null and dose_interval_days > 0)
    or
    (schedule_type = 'weekdays' and weekdays is not null and array_length(weekdays, 1) > 0)
    or
    (schedule_type = 'occasional')
  );
