-- ============================================================
-- Custom Categories
-- ============================================================
create table if not exists public.categories (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  name       text not null,
  type       text check (type in ('income', 'expense')) not null,
  color      text not null default '#94a3b8',
  created_at timestamptz default now() not null,
  unique (user_id, name, type)
);

alter table public.categories enable row level security;

create policy "Users manage their own categories"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.categories to authenticated;

-- ============================================================
-- Financial Goals
-- ============================================================
create table if not exists public.goals (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,
  name           text not null,
  description    text,
  icon           text not null default 'target',
  color          text not null default '#3aaa6e',
  target_amount  numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) not null default 0,
  start_date     date not null,
  end_date       date not null,
  completed_at   timestamptz,
  created_at     timestamptz default now() not null
);

create index if not exists goals_user_id_idx on public.goals (user_id);

alter table public.goals enable row level security;

create policy "Users manage their own goals"
  on public.goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.goals to authenticated;

-- ============================================================
-- Goal Contributions (history of deposits/withdrawals)
-- ============================================================
create table if not exists public.goal_contributions (
  id         uuid default gen_random_uuid() primary key,
  goal_id    uuid references public.goals(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  amount     numeric(12,2) not null,  -- positive = add, negative = withdraw
  note       text,
  date       date not null,
  created_at timestamptz default now() not null
);

create index if not exists goal_contributions_goal_id_idx on public.goal_contributions (goal_id);

alter table public.goal_contributions enable row level security;

create policy "Users manage their own goal contributions"
  on public.goal_contributions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.goal_contributions to authenticated;
