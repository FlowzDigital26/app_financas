-- ============================================================
-- Monthly planning (Planejamento) — one row per category line, per month
-- Replaces the single-row user_budget_config for the planning screen.
-- kind: renda (income) | investimento | fixo | variavel (expenses)
-- ============================================================
create table if not exists public.budget_plans (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  month      date not null,                       -- always the 1st day of the month
  name       text not null,                       -- category / line name
  kind       text check (kind in ('renda', 'investimento', 'fixo', 'variavel')) not null,
  planned    numeric(12,2) not null default 0 check (planned >= 0),
  created_at timestamptz default now() not null,
  unique (user_id, month, name, kind)
);

create index if not exists budget_plans_user_month_idx
  on public.budget_plans (user_id, month);

alter table public.budget_plans enable row level security;

create policy "Users manage their own budget plans"
  on public.budget_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.budget_plans to authenticated;
