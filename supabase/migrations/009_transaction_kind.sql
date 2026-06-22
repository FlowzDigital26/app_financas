-- ============================================================
-- Classificação de planejamento na transação (Renda/Fixo/Variável/Investimento)
-- Permite criar a linha do Planejamento automaticamente ao lançar a transação.
-- ============================================================
alter table public.transactions
  add column if not exists kind text
  check (kind in ('renda', 'investimento', 'fixo', 'variavel'));
