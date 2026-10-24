// src/lib/supabase.ts — Supabase Client Initialization
// Connects to Supabase via VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
// Falls back to localStorage when environment variables are missing.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve client-side environment variables safely
// VITE_SUPABASE_PUBLISHABLE_KEY is the new publishable key (anon key)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
) as string | undefined;

// Check if valid credentials are provided (and not empty or template placeholders)
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabasePublishableKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project') &&
    !supabasePublishableKey.includes('your-anon-key') &&
    supabasePublishableKey.trim().length > 10
);

// Only initialize SupabaseClient if valid credentials exist
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
