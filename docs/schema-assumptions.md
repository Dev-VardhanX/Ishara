# Database Schema & Mappings — Ishara

Verified from `backend/supabase/migrations/0001_init.sql`. The client application interacts directly with these tables using Supabase-JS under Row Level Security (RLS). No schema alterations were made.

---

## 1. Table Definitions

### `public.profiles`
User profile information, linked 1:1 with `auth.users`.
- `id` (`uuid`, PRIMARY KEY, references `auth.users(id)` ON DELETE CASCADE)
- `name` (`text`, nullable)
- `preferred_lang` (`text`, default `'en'`)
- `created_at` (`timestamptz`, default `now()`)
- **RLS Policy**: `auth.uid() = id` (Users can SELECT, INSERT, UPDATE only their own profile)

### `public.conversations`
Top-level conversation session container.
- `id` (`uuid`, PRIMARY KEY, default `gen_random_uuid()`)
- `user_id` (`uuid`, NOT NULL, references `auth.users(id)` ON DELETE CASCADE)
- `started_at` (`timestamptz`, default `now()`)
- `sign_lang` (`text`, check `sign_lang in ('ISL','ASL')`)
- `output_lang` (`text`, nullable)
- **RLS Policy**: `auth.uid() = user_id`

### `public.messages`
Individual translation turns and recognized sentences within a conversation.
- `id` (`uuid`, PRIMARY KEY, default `gen_random_uuid()`)
- `conversation_id` (`uuid`, NOT NULL, references `public.conversations(id)` ON DELETE CASCADE)
- `user_id` (`uuid`, NOT NULL, references `auth.users(id)` ON DELETE CASCADE)
- `direction` (`text`, check `direction in ('sign_to_voice','voice_to_sign')`)
- `text` (`text`, input or recognized text)
- `translated_text` (`text`, speech output or gloss transcription)
- `audio_path` (`text`, nullable, storage reference in `audio` bucket)
- `emotion` (`text`, nullable, check `emotion in ('neutral','happy','sad','angry','surprised')`)
- `created_at` (`timestamptz`, default `now()`)
- **RLS Policy**: `auth.uid() = user_id`

### `public.learn_progress`
Tracks user quiz and lesson completion states.
- `user_id` (`uuid`, NOT NULL, references `auth.users(id)` ON DELETE CASCADE)
- `lesson_id` (`text`, NOT NULL)
- `status` (`text`, nullable, e.g. `'completed'`, `'in_progress'`)
- `score` (`int`, nullable)
- `updated_at` (`timestamptz`, default `now()`)
- **Primary Key**: `(user_id, lesson_id)`
- **RLS Policy**: `auth.uid() = user_id`

---

## 2. Client-Side Schema Mapping Notes

1. **History & Recent Conversations**:
   - Every Sign to Voice or Voice to Sign action inserts a `conversations` record followed by a `messages` record.
   - When fetching history for the UI, `conversations` are queried with their associated `messages`, ordered by `started_at DESC`.
   - UI fields such as `title`, `snippet`, and `mode` are derived from `direction`, `sign_lang`, `output_lang`, and the message `text` / `translated_text`.
   - Date groupings (`TODAY`, `YESTERDAY`, `EARLIER`) are calculated dynamically from `conversations.started_at`.
2. **Deleting Conversations**:
   - Deleting a conversation by `id` cascades automatically to its `messages` via `ON DELETE CASCADE`.
3. **Profile Creation**:
   - Handled via SQL trigger `on_auth_user_created` in the backend, but also checked and inserted client-side on login if missing for backward compatibility or direct signups.
4. **Offline Fallback**:
   - If Supabase environment variables are missing or network calls fail, the store seamlessly falls back to `localStorage` caches with no UI interruptions.
