-- Extended personal details users can self-manage on their profile page.
-- The existing p_profiles_self_update policy (id = auth.uid(), role unchanged)
-- already governs these columns row-wide, so no new RLS is required.

alter table public.profiles
  add column if not exists bio         text,
  add column if not exists age         int check (age is null or (age >= 14 and age <= 120)),
  add column if not exists phone       text,
  add column if not exists job_title   text,
  add column if not exists location    text,
  add column if not exists skills      text[] not null default '{}',
  add column if not exists tech_stacks text[] not null default '{}';
