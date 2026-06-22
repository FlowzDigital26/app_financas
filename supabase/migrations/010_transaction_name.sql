-- ============================================================
-- Nome da transação (separado da descrição)
-- "name" = título curto exibido nas listas; "description" = detalhe opcional.
-- Preenche name com a description atual para as transações já existentes.
-- ============================================================
alter table public.transactions
  add column if not exists name text;

update public.transactions
  set name = description
  where name is null;
