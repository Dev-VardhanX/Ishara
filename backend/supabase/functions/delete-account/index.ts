// Supabase Edge Function: delete-account
// Safely and completely deletes a user's account and all associated data:
// 1. Verifies the caller's identity via their Authorization JWT.
// 2. Removes all audio files stored under their user ID folder in the "audio" bucket.
// 3. Deletes records from messages, conversations, learn_progress, and profiles tables.
// 4. Deletes the authentication user record from auth.users.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Accept only POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Only POST is accepted." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // 1. Verify caller identity using Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: missing Supabase environment variables" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Client scoped to the caller's JWT to authenticate them securely
    const userClient = createClient(supabaseUrl, supabaseAnonKey ?? supabaseServiceRoleKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // User ID is derived strictly from the verified JWT
    const userId = user.id;

    // Admin client with service role key to perform deletions across storage, DB, and auth
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 2. Step 4a: List and delete all files in "audio" bucket under {user_id}/
    try {
      const filesToDelete: string[] = [];
      const folderStack: string[] = [userId];

      while (folderStack.length > 0) {
        const currentFolder = folderStack.pop()!;
        const { data: listedItems, error: listError } = await adminClient.storage
          .from("audio")
          .list(currentFolder, { limit: 100, offset: 0 });

        if (listError) {
          throw listError;
        }

        if (listedItems && listedItems.length > 0) {
          for (const item of listedItems) {
            const itemPath = `${currentFolder}/${item.name}`;
            // If item has no id or metadata, it is a subfolder
            if (item.id === null || !item.metadata) {
              folderStack.push(itemPath);
            } else {
              filesToDelete.push(itemPath);
            }
          }
        }
      }

      if (filesToDelete.length > 0) {
        const { error: removeError } = await adminClient.storage
          .from("audio")
          .remove(filesToDelete);

        if (removeError) {
          throw removeError;
        }
      }
    } catch (storageErr) {
      const errorMessage = storageErr instanceof Error ? storageErr.message : String(storageErr);
      return new Response(
        JSON.stringify({ error: `Failed at step 4a (audio storage cleanup): ${errorMessage}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Step 4b: Delete rows from database tables
    // 3.1 messages
    const { error: messagesError } = await adminClient
      .from("messages")
      .delete()
      .eq("user_id", userId);

    if (messagesError) {
      return new Response(
        JSON.stringify({ error: `Failed at step 4b (messages table cleanup): ${messagesError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3.2 conversations
    const { error: conversationsError } = await adminClient
      .from("conversations")
      .delete()
      .eq("user_id", userId);

    if (conversationsError) {
      return new Response(
        JSON.stringify({ error: `Failed at step 4b (conversations table cleanup): ${conversationsError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3.3 learn_progress
    const { error: progressError } = await adminClient
      .from("learn_progress")
      .delete()
      .eq("user_id", userId);

    if (progressError) {
      return new Response(
        JSON.stringify({ error: `Failed at step 4b (learn_progress table cleanup): ${progressError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3.4 profiles
    const { error: profilesError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profilesError) {
      return new Response(
        JSON.stringify({ error: `Failed at step 4b (profiles table cleanup): ${profilesError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Step 4c: Delete auth user record
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      return new Response(
        JSON.stringify({ error: `Failed at step 4c (auth user deletion): ${deleteUserError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // All steps completed successfully
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: `Unexpected error during account deletion: ${message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
