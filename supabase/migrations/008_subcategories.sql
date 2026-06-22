-- ============================================================
-- Subcategorias + planejamento por Nome/Categoria/Subcategoria
-- ============================================================

-- 1. Subcategoria nas transações (para o realizado casar no nível fino)
alter table public.transactions
  add column if not exists subcategory text;

-- 2. Cadastro de subcategorias (lista reutilizável, agrupada por categoria)
create table if not exists public.subcategories (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  category_name text not null,                 -- categoria "pai" (ex: Lazer)
  name          text not null,                 -- ex: Spotify
  created_at    timestamptz default now() not null,
  unique (user_id, category_name, name)
);

create index if not exists subcategories_user_idx
  on public.subcategories (user_id, category_name);

alter table public.subcategories enable row level security;

create policy "Users manage their own subcategories"
  on public.subcategories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.subcategories to authenticated;

-- 3. Reestrutura o planejamento: Nome (label) + Categoria + Subcategoria + Valor
--    (a tabela é nova/de testes, então recriamos limpa)
drop table if exists public.budget_plans cascade;

create table public.budget_plans (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  month       date not null,                   -- 1º dia do mês
  kind        text check (kind in ('renda', 'investimento', 'fixo', 'variavel')) not null,
  label       text not null,                   -- Nome (ex: Assinatura do Spotify)
  category    text not null,                   -- Categoria (ex: Lazer)
  subcategory text,                            -- Subcategoria (ex: Spotify), opcional
  planned     numeric(12,2) not null default 0 check (planned >= 0),  -- Valor
  created_at  timestamptz default now() not null,
  unique (user_id, month, kind, label)
);

create index if not exists budget_plans_user_month_idx
  on public.budget_plans (user_id, month);

alter table public.budget_plans enable row level security;

create policy "Users manage their own budget plans"
  on public.budget_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.budget_plans to authenticated;
