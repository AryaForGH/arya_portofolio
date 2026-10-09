alter table public.profiles
  add column if not exists phone text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_phone_length_check'
  ) then
    alter table public.profiles
      add constraint profiles_phone_length_check check (char_length(phone) <= 32);
  end if;
end;
$$;
