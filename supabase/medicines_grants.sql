-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- La tabella è stata creata a mano via SQL Editor: il ruolo "authenticated"
-- non riceve i permessi di base in automatico (a differenza di quando si crea
-- una tabella dalla UI "Table Editor" di Supabase, che li concede da sola).
-- Le policy RLS filtrano le righe, ma senza questo GRANT di base il ruolo
-- non può nemmeno provare ad accedere alla tabella → "permission denied".

grant select, insert, update, delete on public.medicines to authenticated;
