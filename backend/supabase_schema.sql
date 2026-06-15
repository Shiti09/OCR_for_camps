-- Run this once in the Supabase SQL editor.
create table if not exists public.patients (
  id           bigserial primary key,
  sr_no        text,
  patient_name text not null,
  age          int,
  sex          text check (sex in ('M', 'F', 'Other', '')),
  contact_number text,
  remarks      text,
  created_at   timestamptz not null default now()
);

create index if not exists patients_created_at_idx
  on public.patients (created_at desc);

-- Optional: open inserts to anon role for the MVP.
-- Tighten with RLS policies for production.
alter table public.patients enable row level security;

create policy "anon can insert"
  on public.patients for insert
  to anon
  with check (true);

create policy "anon can read"
  on public.patients for select
  to anon
  using (true);
