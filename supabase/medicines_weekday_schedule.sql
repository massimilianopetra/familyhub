-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Aggiunge un secondo tipo di posologia oltre a "ogni N giorni"
-- (dose_interval_days): assunzione in giorni fissi della settimana, es.
-- "1 compressa il giovedì e la domenica". schedule_type distingue le due
-- modalità; weekdays è valorizzato solo per 'weekdays' e usa la stessa
-- convenzione di JS Date.getDay() (0=domenica ... 6=sabato) così l'app non
-- deve fare traduzioni di indice tra colonna e calcolo.

alter table medicines
  add column schedule_type text not null default 'interval'
    check (schedule_type in ('interval', 'weekdays')),
  add column weekdays smallint[],
  alter column dose_interval_days drop not null;

alter table medicines
  add constraint medicines_schedule_check check (
    (schedule_type = 'interval' and dose_interval_days is not null and dose_interval_days > 0)
    or
    (schedule_type = 'weekdays' and weekdays is not null and array_length(weekdays, 1) > 0)
  );
