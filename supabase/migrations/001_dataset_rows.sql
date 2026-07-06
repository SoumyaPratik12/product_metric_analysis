alter table public.datasets
  add column if not exists row_count integer not null default 0,
  add column if not exists columns_json jsonb not null default '[]'::jsonb,
  add column if not exists last_error text;

create table if not exists public.dataset_rows (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  row_index integer not null,
  row_data jsonb not null,
  created_at timestamptz not null default now(),
  unique (dataset_id, row_index)
);

alter table public.dataset_rows enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dataset_rows'
      and policyname = 'Users can manage own dataset rows'
  ) then
    create policy "Users can manage own dataset rows" on public.dataset_rows
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists dataset_rows_dataset_id_idx
  on public.dataset_rows (dataset_id);

create index if not exists dataset_rows_user_id_idx
  on public.dataset_rows (user_id);
