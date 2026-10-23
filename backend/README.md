# Ishara backend (Supabase) - Member B

Supabase provides Auth (email + Google), Postgres, and Storage. No custom server is needed.

## Setup
1. Create a Supabase project; invite the other two members.
2. Copy `.env.example` to `.env` (never commit it) and fill in the project URL and anon key.
3. Run `supabase/migrations/0001_init.sql` in the SQL editor (or with the Supabase CLI).
4. Auth settings: enable email + password and Google; set email templates; enable password reset.
5. Storage: create a private bucket named `audio` and apply the storage policies in the migration.
6. Test with two accounts: user 1 must not be able to read user 2's rows.

Share the URL and **anon key only** with the team (private note). Never share the service-role key.
