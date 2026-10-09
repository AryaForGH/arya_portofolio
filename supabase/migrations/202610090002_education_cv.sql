create table if not exists public.educations (
  id uuid primary key default gen_random_uuid(),
  institution text not null check (char_length(btrim(institution)) between 1 and 200),
  degree jsonb not null default '{}'::jsonb,
  field_of_study jsonb not null default '{}'::jsonb,
  location text not null default '',
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description jsonb not null default '{}'::jsonb,
  achievements jsonb not null default '[]'::jsonb check (jsonb_typeof(achievements) = 'array'),
  grade text not null default '',
  logo_url text not null default '',
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint educations_valid_dates check (
    (end_date is null or start_date is null or end_date >= start_date)
    and (not is_current or end_date is null)
  )
);

create table if not exists public.cv_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  original_filename text not null default '',
  download_filename text not null default 'CV.pdf'
    check (download_filename ~ '^[A-Za-z0-9][A-Za-z0-9 _.-]{0,115}\.pdf$'),
  storage_path text not null default '',
  uploaded_at timestamptz,
  file_size bigint check (file_size is null or file_size between 1 and 5242880),
  button_enabled boolean not null default false,
  button_label jsonb not null default '{"id":"Unduh CV","en":"Download CV"}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cv_active_has_file check (not is_active or (storage_path <> '' and uploaded_at is not null))
);

create index if not exists educations_public_order_idx
  on public.educations (published, sort_order, start_date desc nulls last);
create index if not exists educations_start_date_idx
  on public.educations (start_date desc nulls last);

drop trigger if exists set_updated_at on public.educations;
create trigger set_updated_at before update on public.educations
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.cv_settings;
create trigger set_updated_at before update on public.cv_settings
  for each row execute function public.set_updated_at();

alter table public.educations enable row level security;
alter table public.cv_settings enable row level security;

drop policy if exists "public reads published education" on public.educations;
create policy "public reads published education" on public.educations
  for select to anon, authenticated using (published = true);
drop policy if exists "admins manage education" on public.educations;
create policy "admins manage education" on public.educations
  for all to authenticated using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());

drop policy if exists "public reads enabled active CV" on public.cv_settings;
create policy "public reads enabled active CV" on public.cv_settings
  for select to anon, authenticated using (button_enabled = true and is_active = true);
drop policy if exists "admins manage CV settings" on public.cv_settings;
create policy "admins manage CV settings" on public.cv_settings
  for all to authenticated using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-cv', 'portfolio-cv', true, 5242880, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "admins list portfolio CV files" on storage.objects;
create policy "admins list portfolio CV files" on storage.objects
  for select to authenticated
  using (public.is_portfolio_admin() and bucket_id = 'portfolio-cv');
drop policy if exists "admins upload portfolio CV files" on storage.objects;
create policy "admins upload portfolio CV files" on storage.objects
  for insert to authenticated
  with check (
    public.is_portfolio_admin()
    and bucket_id = 'portfolio-cv'
    and lower(storage.extension(name)) = 'pdf'
    and metadata->>'mimetype' = 'application/pdf'
    and case
      when coalesce(metadata->>'size', '') ~ '^[0-9]{1,16}$'
        then (metadata->>'size')::bigint between 1 and 5242880
      else false
    end
  );
drop policy if exists "admins update portfolio CV files" on storage.objects;
create policy "admins update portfolio CV files" on storage.objects
  for update to authenticated
  using (public.is_portfolio_admin() and bucket_id = 'portfolio-cv')
  with check (
    public.is_portfolio_admin()
    and bucket_id = 'portfolio-cv'
    and lower(storage.extension(name)) = 'pdf'
    and metadata->>'mimetype' = 'application/pdf'
    and case
      when coalesce(metadata->>'size', '') ~ '^[0-9]{1,16}$'
        then (metadata->>'size')::bigint between 1 and 5242880
      else false
    end
  );
drop policy if exists "admins delete portfolio CV files" on storage.objects;
create policy "admins delete portfolio CV files" on storage.objects
  for delete to authenticated
  using (public.is_portfolio_admin() and bucket_id = 'portfolio-cv');
