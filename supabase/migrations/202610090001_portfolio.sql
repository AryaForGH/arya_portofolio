create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_portfolio_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    and coalesce((auth.jwt() -> 'app_metadata' ->> 'must_change_password') <> 'true', true);
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  full_name text not null default '',
  profession jsonb not null default '{}'::jsonb,
  headline jsonb not null default '{}'::jsonb,
  bio jsonb not null default '{}'::jsonb,
  education jsonb not null default '{}'::jsonb,
  location text not null default '',
  email text not null default '',
  avatar_url text not null default '',
  cv_url text not null default '',
  availability_text jsonb not null default '{}'::jsonb,
  section_visibility jsonb not null default '{}'::jsonb,
  seo_title jsonb not null default '{}'::jsonb,
  seo_description jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title jsonb not null default '{}'::jsonb,
  short_description jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  thumbnail_url text not null default '',
  gallery_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery_urls) = 'array'),
  category text not null default '',
  technologies jsonb not null default '[]'::jsonb check (jsonb_typeof(technologies) = 'array'),
  year integer check (year is null or year between 1900 and 2200),
  status text not null default 'completed' check (status in ('planned','in_progress','completed','archived')),
  featured boolean not null default false,
  github_url text not null default '',
  live_url text not null default '',
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null default '{}'::jsonb,
  issuer text not null default '',
  issue_date date,
  expiry_date date,
  credential_id text not null default '',
  verification_url text not null default '',
  preview_url text not null default '',
  pdf_url text not null default '',
  description jsonb not null default '{}'::jsonb,
  category text not null default '',
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (expiry_date is null or issue_date is null or expiry_date >= issue_date)
);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  organization text not null default '',
  position jsonb not null default '{}'::jsonb,
  experience_type text not null default 'work',
  location text not null default '',
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description jsonb not null default '{}'::jsonb,
  responsibilities jsonb not null default '[]'::jsonb check (jsonb_typeof(responsibilities) = 'array'),
  achievements jsonb not null default '[]'::jsonb check (jsonb_typeof(achievements) = 'array'),
  logo_url text not null default '',
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (is_current or end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null default '{}'::jsonb,
  category text not null default '',
  proficiency integer check (proficiency is null or proficiency between 0 and 100),
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null default '{}'::jsonb,
  category text not null default '',
  description jsonb not null default '{}'::jsonb,
  price_min numeric(14,2) check (price_min is null or price_min >= 0),
  price_max numeric(14,2) check (price_max is null or price_max >= 0),
  price_fixed boolean not null default false,
  currency text not null default 'IDR',
  estimated_duration text not null default '',
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  revisions integer check (revisions is null or revisions >= 0),
  complexity text not null default '',
  featured boolean not null default false,
  available boolean not null default false,
  terms jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (price_max is null or price_min is null or price_max >= price_min)
);

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null default '',
  url text not null default '',
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default 'null'::jsonb,
  description text not null default '',
  is_public boolean not null default false,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
alter table public.site_settings add column if not exists is_public boolean not null default false;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  message text not null check (char_length(message) between 1 and 5000),
  language text not null default 'id' check (language in ('id','en')),
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
alter table public.contact_messages add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.admin_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_.-]{3,40}$'),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0)
);
create index if not exists contact_rate_limits_window_idx on public.contact_rate_limits (window_started_at);

create or replace function public.consume_contact_rate_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz := timezone('utc', now());
  row_value public.contact_rate_limits%rowtype;
begin
  delete from public.contact_rate_limits
  where window_started_at < current_window - interval '1 day';
  insert into public.contact_rate_limits (ip_hash, window_started_at, attempts)
  values (p_ip_hash, current_window, 1)
  on conflict (ip_hash) do update
    set window_started_at = case
      when public.contact_rate_limits.window_started_at < current_window - interval '15 minutes' then current_window
      else public.contact_rate_limits.window_started_at
    end,
    attempts = case
      when public.contact_rate_limits.window_started_at < current_window - interval '15 minutes' then 1
      else public.contact_rate_limits.attempts + 1
    end
  returning * into row_value;
  return row_value.attempts <= 5;
end;
$$;

revoke all on function public.consume_contact_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_contact_rate_limit(text) to service_role;

create index if not exists projects_public_order_idx on public.projects (published, sort_order, created_at desc);
create index if not exists projects_category_idx on public.projects (category) where published;
create index if not exists certificates_public_order_idx on public.certificates (published, sort_order, issue_date desc);
create index if not exists experiences_public_order_idx on public.experiences (published, sort_order, start_date desc);
create index if not exists services_public_order_idx on public.services (published, available, sort_order);
create index if not exists skills_public_order_idx on public.skills (published, sort_order);
create index if not exists social_links_public_order_idx on public.social_links (published, sort_order);
create index if not exists site_settings_key_idx on public.site_settings (key) where published;
create index if not exists messages_created_idx on public.contact_messages (created_at desc);
create index if not exists messages_unread_idx on public.contact_messages (read_at) where read_at is null;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','projects','certificates','experiences','skills','services','social_links','site_settings','contact_messages']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
  end loop;
end;
$$;

drop policy if exists "public reads published" on public.site_settings;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.certificates enable row level security;
alter table public.experiences enable row level security;
alter table public.skills enable row level security;
alter table public.services enable row level security;
alter table public.social_links enable row level security;
alter table public.site_settings enable row level security;
alter table public.contact_messages enable row level security;
alter table public.admin_accounts enable row level security;
alter table public.contact_rate_limits enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','projects','certificates','experiences','skills','services','social_links','site_settings']
  loop
    execute format('drop policy if exists "public reads published" on public.%I', table_name);
    execute format('create policy "public reads published" on public.%I for select to anon, authenticated using (published = true)', table_name);
    execute format('drop policy if exists "admins manage content" on public.%I', table_name);
    execute format('create policy "admins manage content" on public.%I for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin())', table_name);
  end loop;
end;
$$;

drop policy if exists "public reads explicitly public settings" on public.site_settings;
create policy "public reads explicitly public settings" on public.site_settings for select to anon, authenticated
  using (published = true and is_public = true);

drop policy if exists "admins manage messages" on public.contact_messages;
create policy "admins manage messages" on public.contact_messages for all to authenticated
  using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
drop policy if exists "admins read account mapping" on public.admin_accounts;
create policy "admins read account mapping" on public.admin_accounts for select to authenticated
  using (public.is_portfolio_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-images','profile-images',true,10485760,array['image/jpeg','image/png','image/webp']),
  ('project-images','project-images',true,15728640,array['image/jpeg','image/png','image/webp']),
  ('certificates','certificates',true,15728640,array['image/jpeg','image/png','image/webp','application/pdf']),
  ('documents','documents',false,20971520,array['application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads published media" on storage.objects;
drop policy if exists "admins list portfolio media" on storage.objects;
create policy "admins list portfolio media" on storage.objects for select to authenticated
using (public.is_portfolio_admin() and bucket_id in ('profile-images','project-images','certificates','documents'));
drop policy if exists "admins upload portfolio media" on storage.objects;
create policy "admins upload portfolio media" on storage.objects for insert to authenticated
with check (public.is_portfolio_admin() and bucket_id in ('profile-images','project-images','certificates','documents'));
drop policy if exists "admins update portfolio media" on storage.objects;
create policy "admins update portfolio media" on storage.objects for update to authenticated
using (public.is_portfolio_admin() and bucket_id in ('profile-images','project-images','certificates','documents'))
with check (public.is_portfolio_admin() and bucket_id in ('profile-images','project-images','certificates','documents'));
drop policy if exists "admins delete portfolio media" on storage.objects;
create policy "admins delete portfolio media" on storage.objects for delete to authenticated
using (public.is_portfolio_admin() and bucket_id in ('profile-images','project-images','certificates','documents'));
