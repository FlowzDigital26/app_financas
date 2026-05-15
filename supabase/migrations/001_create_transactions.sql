-- Create transactions table
create table if not exists public.transactions (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  type        text check (type in ('income', 'expense')) not null,
  amount      numeric(12, 2) not null check (amount > 0),
  description text not null,
  category    text not null,
  date        date not null,
  created_at  timestamptz default now() not null
);

-- Indexes
create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_date_idx on public.transactions (date desc);
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);

-- Row Level Security
alter table public.transactions enable row level security;

create policy "Users can view their own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- Grant access to authenticated users
grant select, insert, update, delete on public.transactions to authenticated;
