import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing authentication token" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Required Supabase environment variables are missing.");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    // Verify the user's access token.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }

    // Admin credentials remain on the server only.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Remove audio files belonging to this user.
    await removeUserAudio(admin, user.id);

    // Database rows should cascade when the Auth user is deleted,
    // provided the foreign-key constraints were created correctly.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("Auth account deletion failed.");
      return jsonResponse({ error: "Unable to delete account" }, 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error(
      "Account deletion failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return jsonResponse({ error: "Account deletion failed" }, 500);
  }
});

async function removeUserAudio(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  const bucket = admin.storage.from("audio");
  const folders = [userId];

  while (folders.length > 0) {
    const folder = folders.pop()!;
    const filesToDelete: string[] = [];

    // Fetch all entries in this folder, including pages beyond the first 100.
    for (let offset = 0; ; offset += 100) {
      const { data: entries, error } = await bucket.list(folder, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        throw new Error("Unable to inspect audio storage");
      }

      if (!entries || entries.length === 0) {
        break;
      }

      for (const entry of entries) {
        const path = `${folder}/${entry.name}`;

        // Storage folders normally have no object ID.
        if (entry.id === null) {
          folders.push(path);
        } else {
          filesToDelete.push(path);
        }
      }

      if (entries.length < 100) {
        break;
      }
    }

    // Delete files in batches.
    for (let i = 0; i < filesToDelete.length; i += 100) {
      const { error } = await bucket.remove(filesToDelete.slice(i, i + 100));

      if (error) {
        throw new Error("Unable to delete audio files");
      }
    }
  }
}