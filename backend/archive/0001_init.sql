-- Ishara: initial schema with Row Level Security
-- Run in the Supabase SQL editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  preferred_lang text default 'en',
  created_at timestamptz default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz default now(),
  sign_lang text check (sign_lang in ('ISL','ASL')),
  output_lang text
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  direction text check (direction in ('sign_to_voice','voice_to_sign')),
  text text,
  translated_text text,
  audio_path text,
  emotion text check (emotion in ('neutral','happy','sad','angry','surprised')),
  created_at timestamptz default now()
);

create table if not exists public.learn_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  status text,
  score int,
  updated_at timestamptz default now(),
  primary key (user_id, lesson_id)
);

create index if not exists idx_conversations_user_date on public.conversations (user_id, started_at desc);
create index if not exists idx_messages_conversation on public.messages (conversation_id, created_at);

-- Row Level Security: each user sees only their own rows
alter table public.profiles       enable row level security;
alter table public.conversations  enable row level security;
alter table public.messages       enable row level security;
alter table public.learn_progress enable row level security;

create policy "profiles_own"       on public.profiles       for all using (auth.uid() = id)      with check (auth.uid() = id);
create policy "conversations_own"  on public.conversations  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "messages_own"       on public.messages       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "learn_progress_own" on public.learn_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create a profile row automatically when a user signs up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, new.raw_user_meta_data->>'name');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage: private bucket "audio", each user only inside their own folder (<user_id>/...)
insert into storage.buckets (id, name, public) values ('audio','audio', false) on conflict do nothing;

create policy "audio_read_own" on storage.objects for select
  using (bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "audio_write_own" on storage.objects for insert
  with check (bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "audio_delete_own" on storage.objects for delete
  using (bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]);
