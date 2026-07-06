create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null default 'demo-project',
  question text not null,
  intent text not null,
  answer text not null,
  chart_type text not null,
  chart_data jsonb not null default '[]'::jsonb,
  insights jsonb not null default '[]'::jsonb,
  generated_query text,
  follow_ups jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null default 'demo-project',
  name text not null,
  layout_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null default 'demo-project',
  file_name text not null,
  file_path text not null,
  file_size bigint not null default 0,
  row_count integer not null default 0,
  columns_json jsonb not null default '[]'::jsonb,
  status text not null default 'uploaded',
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.dataset_rows (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  row_index integer not null,
  row_data jsonb not null,
  created_at timestamptz not null default now(),
  unique (dataset_id, row_index)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null default 'demo-project',
  title text not null,
  content_json jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.saved_dashboards enable row level security;
alter table public.datasets enable row level security;
alter table public.dataset_rows enable row level security;
alter table public.reports enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can manage owned organizations" on public.organizations
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Users can read memberships" on public.organization_members
  for select using (auth.uid() = user_id);

create policy "Users can manage own memberships" on public.organization_members
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage owned projects" on public.projects
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Users can manage own conversations" on public.ai_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own dashboards" on public.saved_dashboards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own datasets" on public.datasets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own dataset rows" on public.dataset_rows
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own reports" on public.reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists dataset_rows_dataset_id_idx
  on public.dataset_rows (dataset_id);

create index if not exists dataset_rows_user_id_idx
  on public.dataset_rows (user_id);

insert into storage.buckets (id, name, public)
values ('product-datasets', 'product-datasets', false)
on conflict (id) do nothing;

create policy "Users can upload own dataset files" on storage.objects
  for insert with check (
    bucket_id = 'product-datasets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own dataset files" on storage.objects
  for select using (
    bucket_id = 'product-datasets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own dataset files" on storage.objects
  for delete using (
    bucket_id = 'product-datasets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
