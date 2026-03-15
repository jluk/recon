-- Recon database schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Competitors table
create table public.competitors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  website text not null default '',
  description text not null default '',
  priority text not null default 'Watch' check (priority in ('Primary', 'Secondary', 'Watch')),
  user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.competitors enable row level security;

create policy "Users can view their own competitors"
  on public.competitors for select
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can insert their own competitors"
  on public.competitors for insert
  with check (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can update their own competitors"
  on public.competitors for update
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can delete their own competitors"
  on public.competitors for delete
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Sources table
create table public.sources (
  id uuid default gen_random_uuid() primary key,
  competitor_id uuid not null references public.competitors(id) on delete cascade,
  name text not null,
  type text not null,
  config jsonb not null default '{}',
  enabled boolean not null default true,
  user_id text not null,
  created_at timestamptz not null default now()
);

alter table public.sources enable row level security;

create policy "Users can view their own sources"
  on public.sources for select
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can insert their own sources"
  on public.sources for insert
  with check (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can update their own sources"
  on public.sources for update
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can delete their own sources"
  on public.sources for delete
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Runs table
create table public.runs (
  id uuid default gen_random_uuid() primary key,
  competitor_id uuid not null references public.competitors(id) on delete cascade,
  type text not null default 'manual' check (type in ('scheduled', 'triggered', 'manual')),
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  findings_count int not null default 0,
  sources_used int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  user_id text not null
);

alter table public.runs enable row level security;

create policy "Users can view their own runs"
  on public.runs for select
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can insert their own runs"
  on public.runs for insert
  with check (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can update their own runs"
  on public.runs for update
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Findings table
create table public.findings (
  id uuid default gen_random_uuid() primary key,
  run_id uuid not null references public.runs(id) on delete cascade,
  competitor_id uuid not null references public.competitors(id) on delete cascade,
  claim text not null,
  reality text not null,
  confidence text not null check (confidence in ('High', 'Medium', 'Low')),
  threat_level text not null check (threat_level in ('High', 'Medium', 'Low', 'Monitor')),
  sources text[] not null default '{}',
  why_it_matters text not null default '',
  user_segment_overlap text not null default '',
  compensating_advantages text not null default '',
  recommended_action text not null default '',
  testing_criteria jsonb,
  user_id text not null,
  created_at timestamptz not null default now()
);

alter table public.findings enable row level security;

create policy "Users can view their own findings"
  on public.findings for select
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can insert their own findings"
  on public.findings for insert
  with check (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can update their own findings"
  on public.findings for update
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Settings table (server-side storage for cron jobs and scheduled runs)
create table public.settings (
  id uuid default gen_random_uuid() primary key,
  user_id text not null unique,
  product_name text not null default '',
  product_context text not null default '',
  gemini_api_key text not null default '',
  email text not null default '',
  enabled_sources text[] not null default '{hackernews,reddit,youtube}',
  schedule_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "Users can view their own settings"
  on public.settings for select
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can insert their own settings"
  on public.settings for insert
  with check (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can update their own settings"
  on public.settings for update
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Add schedule_frequency to competitors (how often to auto-analyze)
-- Defaults based on priority: Primary=weekly, Secondary=biweekly, Watch=monthly
alter table public.competitors
  add column schedule_frequency text not null default 'default'
  check (schedule_frequency in ('daily', 'weekly', 'biweekly', 'monthly', 'never', 'default'));

-- Indexes
create index idx_competitors_user_id on public.competitors(user_id);
create index idx_sources_competitor_id on public.sources(competitor_id);
create index idx_sources_user_id on public.sources(user_id);
create index idx_runs_competitor_id on public.runs(competitor_id);
create index idx_runs_user_id on public.runs(user_id);
create index idx_findings_run_id on public.findings(run_id);
create index idx_findings_competitor_id on public.findings(competitor_id);
create index idx_findings_user_id on public.findings(user_id);
create index idx_settings_user_id on public.settings(user_id);
