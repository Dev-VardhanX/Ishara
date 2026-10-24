-- Ishara: Core Database Schema Migration
-- Migration: 20261023210055_core_schema.sql

-- 1. Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_language text default 'en',
  sign_language text default 'ISL' check (sign_language in ('ISL', 'ASL')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text check (mode in ('sign_to_voice', 'voice_to_sign')),
  sign_language text,
  source_lang text,
  target_lang text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- 3. Messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text,
  translated_text text,
  gloss jsonb,
  emotion text default 'neutral' check (emotion in ('neutral', 'happy', 'sad', 'angry', 'surprised')),
  audio_path text,
  confidence real,
  created_at timestamptz default now()
);

-- 4. Lessons table
create table if not exists public.lessons (
  id text primary key,
  sign_language text,
  title text,
  content jsonb,
  order_index int
);

-- 5. Learn Progress table
create table if not exists public.learn_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  score real,
  completed boolean default false,
  updated_at timestamptz default now(),
  unique (user_id, lesson_id)
);

-- 6. Language Packs table
create table if not exists public.language_packs (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text,
  size_mb numeric,
  version text,
  download_url text,
  created_at timestamptz default now()
);

-- Foreign key & query performance indexes
create index if not exists idx_conversations_user on public.conversations (user_id, created_at desc);
create index if not exists idx_messages_conversation on public.messages (conversation_id, created_at);
create index if not exists idx_messages_user on public.messages (user_id);
create index if not exists idx_learn_progress_user on public.learn_progress (user_id);

-- Helper function: auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
  before update on public.conversations
  for each row
  execute function public.handle_updated_at();

drop trigger if exists set_learn_progress_updated_at on public.learn_progress;
create trigger set_learn_progress_updated_at
  before update on public.learn_progress
  for each row
  execute function public.handle_updated_at();

-- Trigger & function: create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
