-- Allow users to hide/delete default categories by storing their names in profile
alter table public.profiles
  add column if not exists hidden_defaults text[] default '{}';
