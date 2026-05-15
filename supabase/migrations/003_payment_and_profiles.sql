-- Add payment fields to transactions
alter table public.transactions
  add column if not exists payment_method text default 'outros',
  add column if not exists bank text;

-- Profiles table for user display name / phone
create table if not exists public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  full_name  text,
  phone      text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users manage their own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant select, insert, update on public.profiles to authenticated;
