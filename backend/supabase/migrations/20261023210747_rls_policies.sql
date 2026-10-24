-- Ishara: Row Level Security (RLS) Policies Migration
-- Migration: 20261023210747_rls_policies.sql

-- 1. Enable RLS on all core tables
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.learn_progress enable row level security;
alter table public.language_packs enable row level security;
alter table public.lessons enable row level security;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using (id = (select auth.uid()));

-- ============================================================================
-- CONVERSATIONS POLICIES
-- ============================================================================
create policy "conversations_select_own"
on public.conversations
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "conversations_insert_own"
on public.conversations
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "conversations_update_own"
on public.conversations
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "conversations_delete_own"
on public.conversations
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================
create policy "messages_select_own"
on public.messages
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "messages_insert_own"
on public.messages
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.conversations
    where id = conversation_id
      and user_id = (select auth.uid())
  )
);

create policy "messages_update_own"
on public.messages
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.conversations
    where id = conversation_id
      and user_id = (select auth.uid())
  )
);

create policy "messages_delete_own"
on public.messages
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ============================================================================
-- LEARN PROGRESS POLICIES
-- ============================================================================
create policy "learn_progress_select_own"
on public.learn_progress
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "learn_progress_insert_own"
on public.learn_progress
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "learn_progress_update_own"
on public.learn_progress
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "learn_progress_delete_own"
on public.learn_progress
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ============================================================================
-- LANGUAGE PACKS POLICIES
-- ============================================================================
-- Publicly readable by both anonymous and authenticated users; no client write access
create policy "language_packs_select_all"
on public.language_packs
for select
to anon, authenticated
using (true);

-- ============================================================================
-- LESSONS POLICIES
-- ============================================================================
-- Readable only by logged-in users; no client write access
create policy "lessons_select_authenticated"
on public.lessons
for select
to authenticated
using (true);
