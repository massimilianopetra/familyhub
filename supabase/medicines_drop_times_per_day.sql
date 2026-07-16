-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Da eseguire DOPO medicines_next_dose.sql (che aggiunge dose_interval_days).
-- "times_per_day" era ridondante: per una cadenza regolare è sempre e solo
-- il reciproco di dose_interval_days (1/N), quindi si teneva la stessa
-- informazione scritta due volte in due unità diverse. Da qui in poi
-- dose_interval_days è l'unico campo per la frequenza (obbligatorio, usato
-- sia per il calcolo scorte che per il promemoria "prossima dose").

update medicines set dose_interval_days = 1 where dose_interval_days is null;

alter table medicines
  drop column times_per_day,
  alter column dose_interval_days set not null,
  alter column dose_interval_days set default 1;
