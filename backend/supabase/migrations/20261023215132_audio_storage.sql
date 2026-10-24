-- Ishara: Audio Storage Bucket and Policies Migration
-- Migration: 20261023215132_audio_storage.sql

-- 1. Create the private "audio" storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio',
  'audio',
  false,
  5242880,
  array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav']
)
on conflict (id) do nothing;

-- 2. Storage Policies for Authenticated Users
-- Restricts access to objects in the 'audio' bucket where the top-level folder matches the user's ID
-- Expected object path: {user_id}/{conversation_id}/{message_id}.mp3

create policy "audio_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'audio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "audio_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'audio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "audio_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'audio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'audio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "audio_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'audio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
