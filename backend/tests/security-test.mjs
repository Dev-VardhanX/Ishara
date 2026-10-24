// Ishara: Automated Security & RLS Test Suite
// Verifies Row Level Security (RLS) policies, storage isolation, and read-only protections
// Built for Node 18+ (ES modules, native fetch only - no third-party dependencies)

import crypto from "node:crypto";

// 1. Environment validation and trimming
const rawUrlInput = process.env.SUPABASE_URL;
const rawPubInput = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const rawServiceInput = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missingVars = [];
if (!rawUrlInput) missingVars.push("SUPABASE_URL");
if (!rawPubInput) missingVars.push("SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY)");
if (!rawServiceInput) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");

if (missingVars.length > 0) {
  console.error("Error: Missing required environment variable(s):");
  for (const v of missingVars) {
    console.error(`  - ${v}`);
  }
  console.error("\nPlease set these in your terminal session before running this script.");
  process.exit(1);
}

// Trim leading and trailing whitespace and newlines from all three environment variables
const SUPABASE_URL = (rawUrlInput || "").trim().replace(/\/+$/, "");
const publishableKey = (rawPubInput || "").trim();
const serviceRoleKey = (rawServiceInput || "").trim();

// Startup check: print name, length, and presence of whitespace / non-ASCII (never the value)
console.log("==================================================");
console.log("Environment Configuration Check:");
const envCheckList = [
  { name: "SUPABASE_URL", value: SUPABASE_URL },
  { name: "SUPABASE_PUBLISHABLE_KEY", value: publishableKey },
  { name: "SUPABASE_SERVICE_ROLE_KEY", value: serviceRoleKey },
];

for (const item of envCheckList) {
  const len = item.value.length;
  const hasWhitespace = /\s/.test(item.value);
  const hasNonAscii = /[^\x20-\x7E]/.test(item.value);
  console.log(`  - ${item.name}: length=${len}, contains_whitespace=${hasWhitespace}, contains_non_ascii=${hasNonAscii}`);
}
console.log("==================================================\n");

// Track test results
let passCount = 0;
let failCount = 0;

function report(name, passed, detail = "") {
  if (passed) {
    passCount++;
    console.log(`[PASS] ${name}`);
  } else {
    failCount++;
    console.error(`[FAIL] ${name}${detail ? ` -> ${detail}` : ""}`);
  }
}

// Helper: HTTP request wrapper with sanitized fetch error reporting
async function api(endpoint, { method = "GET", headers = {}, body } = {}) {
  const url = `${SUPABASE_URL}${endpoint}`;
  const options = {
    method,
    headers: { ...headers },
  };

  if (body !== undefined) {
    if (typeof body === "string" || body instanceof Uint8Array || Buffer.isBuffer(body)) {
      options.body = body;
    } else {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
  }

  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    let urlPath = endpoint;
    try {
      urlPath = new URL(url).pathname;
    } catch {
      urlPath = endpoint.split("?")[0];
    }

    const causeCode = err?.cause?.code || "";
    const causeMsg = err?.cause?.message || (err?.cause ? String(err.cause) : "");
    const causeInfo = [causeCode, causeMsg].filter(Boolean).join(" - ") || "unknown cause";

    // Print method, path, and error cause without leaking keys, tokens, or headers
    console.error(`  [Fetch Failure] Method: ${method}, Path: ${urlPath}, Cause: ${causeInfo}`);

    const enhancedErr = new Error(`${method} ${urlPath} -> ${err.message} (Cause: ${causeInfo})`);
    enhancedErr.cause = err.cause;
    throw enhancedErr;
  }

  let data = null;
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await res.text();
    } catch {
      data = null;
    }
  }

  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

// Helper: Get admin headers based on secret key format
// Modern Supabase keys (sb_secret_...) must be sent ONLY in the apikey header.
// Legacy JWT keys (starting with eyJ) also include Authorization: Bearer.
function getAdminHeaders() {
  const headers = {
    apikey: serviceRoleKey,
  };
  if (serviceRoleKey.startsWith("eyJ")) {
    headers["Authorization"] = `Bearer ${serviceRoleKey}`;
  }
  return headers;
}

// Helper: Safely extract status message without exposing tokens or secrets
function getResponseMessage(data) {
  if (!data || typeof data !== "object") return "";
  return data.msg || data.message || data.error_description || data.error || "";
}

// Test resources tracking for guaranteed cleanup
let user1 = null;
let user2 = null;
let user1Token = null;
let user2Token = null;
const uploadedFiles = [];

async function run() {
  console.log("==================================================");
  console.log("Starting Ishara Security & RLS Test Suite");
  console.log(`Target URL: ${SUPABASE_URL}`);
  console.log("==================================================\n");

  const rand = crypto.randomBytes(4).toString("hex");
  const user1Email = `rls-test-u1-${rand}@example.com`;
  const user2Email = `rls-test-u2-${rand}@example.com`;
  const testPassword = `P@ssword_${rand}!2026`;

  // --------------------------------------------------------------------------
  // STEP 1: Create two temporary users with service role key & login
  // --------------------------------------------------------------------------
  try {
    const createU1 = await api("/auth/v1/admin/users", {
      method: "POST",
      headers: getAdminHeaders(),
      body: {
        email: user1Email,
        password: testPassword,
        email_confirm: true,
      },
    });
    const msgU1 = getResponseMessage(createU1.data);
    console.log(`  Create User 1 -> HTTP ${createU1.status}${msgU1 ? `: ${msgU1}` : ""}`);

    const createU2 = await api("/auth/v1/admin/users", {
      method: "POST",
      headers: getAdminHeaders(),
      body: {
        email: user2Email,
        password: testPassword,
        email_confirm: true,
      },
    });
    const msgU2 = getResponseMessage(createU2.data);
    console.log(`  Create User 2 -> HTTP ${createU2.status}${msgU2 ? `: ${msgU2}` : ""}`);

    if (createU1.ok && createU1.data?.id) user1 = createU1.data;
    if (createU2.ok && createU2.data?.id) user2 = createU2.data;

    // Log in user 1 with publishable key
    const loginU1 = await api("/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: publishableKey },
      body: { email: user1Email, password: testPassword },
    });
    const msgLogin1 = getResponseMessage(loginU1.data);
    console.log(`  Log in User 1 -> HTTP ${loginU1.status}${msgLogin1 ? `: ${msgLogin1}` : ""}`);
    user1Token = loginU1.data?.access_token;

    // Log in user 2 with publishable key
    const loginU2 = await api("/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: publishableKey },
      body: { email: user2Email, password: testPassword },
    });
    const msgLogin2 = getResponseMessage(loginU2.data);
    console.log(`  Log in User 2 -> HTTP ${loginU2.status}${msgLogin2 ? `: ${msgLogin2}` : ""}`);
    user2Token = loginU2.data?.access_token;

    const step1Success = Boolean(user1?.id && user2?.id && user1Token && user2Token);
    report(
      "1. Created temporary users and acquired auth tokens",
      step1Success,
      step1Success ? `U1: ${user1.id}, U2: ${user2.id}` : "Step 1 provisioning or login failed"
    );

    if (!step1Success) {
      console.error("\n[HALT] Stopping remaining checks immediately because Step 1 failed.");
      return;
    }
  } catch (err) {
    report("1. Created temporary users and acquired auth tokens", false, err.message);
    console.error("\n[HALT] Stopping remaining checks immediately due to an unhandled error in Step 1.");
    return;
  }

  const u1Headers = {
    apikey: publishableKey,
    Authorization: `Bearer ${user1Token}`,
    Prefer: "return=representation",
  };

  const u2Headers = {
    apikey: publishableKey,
    Authorization: `Bearer ${user2Token}`,
    Prefer: "return=representation",
  };

  const anonHeaders = {
    apikey: publishableKey,
  };

  let conv1 = null;
  let msg1 = null;

  // --------------------------------------------------------------------------
  // STEP 2: As user 1, insert conversation, message, and learn_progress, then read back
  // --------------------------------------------------------------------------
  try {
    // 2.1 Insert conversation
    const convRes = await api("/rest/v1/conversations", {
      method: "POST",
      headers: u1Headers,
      body: {
        user_id: user1.id,
        mode: "sign_to_voice",
        sign_language: "ISL",
      },
    });
    conv1 = Array.isArray(convRes.data) ? convRes.data[0] : null;

    // 2.2 Insert message
    let msgRes = null;
    if (conv1?.id) {
      msgRes = await api("/rest/v1/messages", {
        method: "POST",
        headers: u1Headers,
        body: {
          conversation_id: conv1.id,
          user_id: user1.id,
          text: "Hello from User 1",
          emotion: "happy",
        },
      });
      msg1 = Array.isArray(msgRes.data) ? msgRes.data[0] : null;
    }

    // 2.3 Insert learn_progress
    const progRes = await api("/rest/v1/learn_progress", {
      method: "POST",
      headers: u1Headers,
      body: {
        user_id: user1.id,
        lesson_id: "isl_01",
        score: 95.5,
        completed: true,
      },
    });
    const prog1 = Array.isArray(progRes.data) ? progRes.data[0] : null;

    // 2.4 Read all back as user 1
    const readConv = await api(`/rest/v1/conversations?id=eq.${conv1?.id}`, { headers: u1Headers });
    const readMsg = await api(`/rest/v1/messages?id=eq.${msg1?.id}`, { headers: u1Headers });
    const readProg = await api(`/rest/v1/learn_progress?user_id=eq.${user1.id}&lesson_id=eq.isl_01`, {
      headers: u1Headers,
    });

    const readSuccess =
      Array.isArray(readConv.data) && readConv.data.length === 1 &&
      Array.isArray(readMsg.data) && readMsg.data.length === 1 &&
      Array.isArray(readProg.data) && readProg.data.length === 1;

    report("2. User 1 can insert and read back own conversation, message, and learn_progress", readSuccess);
  } catch (err) {
    report("2. User 1 can insert and read back own conversation, message, and learn_progress", false, err.message);
  }

  // --------------------------------------------------------------------------
  // STEP 3: As user 2, verify isolation from user 1's data
  // --------------------------------------------------------------------------

  // 3a: Reading user 1's data returns empty results
  try {
    const u2ReadConv = await api(`/rest/v1/conversations?id=eq.${conv1?.id}`, { headers: u2Headers });
    const u2ReadMsg = await api(`/rest/v1/messages?id=eq.${msg1?.id}`, { headers: u2Headers });
    const u2ReadProg = await api(`/rest/v1/learn_progress?user_id=eq.${user1.id}`, { headers: u2Headers });

    const isolationOk =
      Array.isArray(u2ReadConv.data) && u2ReadConv.data.length === 0 &&
      Array.isArray(u2ReadMsg.data) && u2ReadMsg.data.length === 0 &&
      Array.isArray(u2ReadProg.data) && u2ReadProg.data.length === 0;

    report("3a. User 2 reading User 1's conversation, message, and progress returns empty array", isolationOk);
  } catch (err) {
    report("3a. User 2 reading User 1's conversation, message, and progress returns empty array", false, err.message);
  }

  // 3b: Updating or deleting user 1's rows fails/affects 0 rows, and data remains intact
  try {
    // Attempt update on conv1
    const patchConv = await api(`/rest/v1/conversations?id=eq.${conv1?.id}`, {
      method: "PATCH",
      headers: u2Headers,
      body: { mode: "voice_to_sign" },
    });
    // Attempt delete on conv1
    const delConv = await api(`/rest/v1/conversations?id=eq.${conv1?.id}`, {
      method: "DELETE",
      headers: u2Headers,
    });

    // Attempt update on msg1
    const patchMsg = await api(`/rest/v1/messages?id=eq.${msg1?.id}`, {
      method: "PATCH",
      headers: u2Headers,
      body: { text: "Hacked by User 2" },
    });
    // Attempt delete on msg1
    const delMsg = await api(`/rest/v1/messages?id=eq.${msg1?.id}`, {
      method: "DELETE",
      headers: u2Headers,
    });

    // Attempt update on learn_progress
    const patchProg = await api(`/rest/v1/learn_progress?user_id=eq.${user1.id}&lesson_id=eq.isl_01`, {
      method: "PATCH",
      headers: u2Headers,
      body: { score: 0 },
    });
    // Attempt delete on learn_progress
    const delProg = await api(`/rest/v1/learn_progress?user_id=eq.${user1.id}&lesson_id=eq.isl_01`, {
      method: "DELETE",
      headers: u2Headers,
    });

    // Confirm as user 1 that rows are intact and unchanged
    const verifyConv = await api(`/rest/v1/conversations?id=eq.${conv1?.id}`, { headers: u1Headers });
    const verifyMsg = await api(`/rest/v1/messages?id=eq.${msg1?.id}`, { headers: u1Headers });
    const verifyProg = await api(`/rest/v1/learn_progress?user_id=eq.${user1.id}&lesson_id=eq.isl_01`, {
      headers: u1Headers,
    });

    const patchBlocked =
      (!Array.isArray(patchConv.data) || patchConv.data.length === 0) &&
      (!Array.isArray(delConv.data) || delConv.data.length === 0) &&
      (!Array.isArray(patchMsg.data) || patchMsg.data.length === 0) &&
      (!Array.isArray(delMsg.data) || delMsg.data.length === 0) &&
      (!Array.isArray(patchProg.data) || patchProg.data.length === 0) &&
      (!Array.isArray(delProg.data) || delProg.data.length === 0);

    const dataUntouched =
      verifyConv.data?.[0]?.mode === "sign_to_voice" &&
      verifyMsg.data?.[0]?.text === "Hello from User 1" &&
      verifyProg.data?.[0]?.score === 95.5;

    report("3b. User 2 cannot update or delete User 1's rows (integrity verified)", patchBlocked && dataUntouched);
  } catch (err) {
    report("3b. User 2 cannot update or delete User 1's rows (integrity verified)", false, err.message);
  }

  // 3c: Inserting message into user 1's conversation fails
  try {
    const injectMsg = await api("/rest/v1/messages", {
      method: "POST",
      headers: u2Headers,
      body: {
        conversation_id: conv1?.id,
        user_id: user2.id,
        text: "Unauthorized injection into user 1 conv",
      },
    });

    // Should fail with 4xx or empty array due to RLS conversation ownership check
    const injectBlocked = !injectMsg.ok || (Array.isArray(injectMsg.data) && injectMsg.data.length === 0);
    report("3c. User 2 cannot insert a message pointing to User 1's conversation_id", injectBlocked);
  } catch (err) {
    report("3c. User 2 cannot insert a message pointing to User 1's conversation_id", false, err.message);
  }

  // 3d: Inserting conversation spoofing user_id set to user 1 fails
  try {
    const spoofConv = await api("/rest/v1/conversations", {
      method: "POST",
      headers: u2Headers,
      body: {
        user_id: user1.id,
        mode: "voice_to_sign",
      },
    });

    const spoofBlocked = !spoofConv.ok || (Array.isArray(spoofConv.data) && spoofConv.data.length === 0);
    report("3d. User 2 cannot insert a conversation with user_id spoofed to User 1", spoofBlocked);
  } catch (err) {
    report("3d. User 2 cannot insert a conversation with user_id spoofed to User 1", false, err.message);
  }

  // 3e: User 2 cannot list files from user 1's folder in audio bucket
  try {
    const listRes = await api("/storage/v1/object/list/audio", {
      method: "POST",
      headers: {
        ...u2Headers,
        "Content-Type": "application/json",
      },
      body: {
        prefix: user1.id,
        limit: 100,
      },
    });

    const listBlocked = !listRes.ok || (Array.isArray(listRes.data) && listRes.data.length === 0);
    report("3e. User 2 cannot list files from User 1's folder in 'audio' bucket", listBlocked);
  } catch (err) {
    report("3e. User 2 cannot list files from User 1's folder in 'audio' bucket", false, err.message);
  }

  // --------------------------------------------------------------------------
  // STEP 4: Audio storage upload as user 1 & download permission check
  // --------------------------------------------------------------------------
  const testFilePath = `${user1.id}/test.mp3`;
  try {
    // Tiny valid audio/mpeg header bytes (ID3 tag prefix)
    const dummyAudioBuffer = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

    const uploadRes = await api(`/storage/v1/object/audio/${testFilePath}`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${user1Token}`,
        "Content-Type": "audio/mpeg",
      },
      body: dummyAudioBuffer,
    });

    if (uploadRes.ok) {
      uploadedFiles.push(testFilePath);
    }

    // User 2 tries to download User 1's audio file -> must be blocked (status 400/403/404)
    const u2Download = await api(`/storage/v1/object/authenticated/audio/${testFilePath}`, {
      method: "GET",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${user2Token}`,
      },
    });

    // User 1 downloads own audio file -> must succeed (status 200)
    const u1Download = await api(`/storage/v1/object/authenticated/audio/${testFilePath}`, {
      method: "GET",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${user1Token}`,
      },
    });

    const storageRlsOk = uploadRes.ok && !u2Download.ok && u1Download.ok;
    report(
      "4. Storage RLS: User 1 uploads, User 1 can download, User 2 is blocked",
      storageRlsOk,
      `U1 upload: ${uploadRes.status}, U2 download: ${u2Download.status}, U1 download: ${u1Download.status}`
    );
  } catch (err) {
    report("4. Storage RLS: User 1 uploads, User 1 can download, User 2 is blocked", false, err.message);
  }

  // --------------------------------------------------------------------------
  // STEP 5: Anonymous (unauthenticated) access checks
  // --------------------------------------------------------------------------
  try {
    const anonConv = await api("/rest/v1/conversations", { headers: anonHeaders });
    const anonMsg = await api("/rest/v1/messages", { headers: anonHeaders });
    const anonProg = await api("/rest/v1/learn_progress", { headers: anonHeaders });
    const anonProf = await api("/rest/v1/profiles", { headers: anonHeaders });
    const anonPacks = await api("/rest/v1/language_packs", { headers: anonHeaders });

    const privateTablesProtected =
      (!anonConv.ok || (Array.isArray(anonConv.data) && anonConv.data.length === 0)) &&
      (!anonMsg.ok || (Array.isArray(anonMsg.data) && anonMsg.data.length === 0)) &&
      (!anonProg.ok || (Array.isArray(anonProg.data) && anonProg.data.length === 0)) &&
      (!anonProf.ok || (Array.isArray(anonProf.data) && anonProf.data.length === 0));

    const languagePacksReadable =
      anonPacks.ok && Array.isArray(anonPacks.data) && anonPacks.data.length >= 3;

    report(
      "5. Anonymous access denied for private tables, allowed for language_packs",
      privateTablesProtected && languagePacksReadable,
      `Language packs found: ${Array.isArray(anonPacks.data) ? anonPacks.data.length : 0}`
    );
  } catch (err) {
    report("5. Anonymous access denied for private tables, allowed for language_packs", false, err.message);
  }

  // --------------------------------------------------------------------------
  // STEP 6: Lessons read access & write protection for authenticated users
  // --------------------------------------------------------------------------
  try {
    // Read lessons as user 1
    const readLessons = await api("/rest/v1/lessons", { headers: u1Headers });
    const canReadLessons = readLessons.ok && Array.isArray(readLessons.data) && readLessons.data.length >= 5;

    // Try modifying lessons as user 1 -> all must be rejected
    const insertLesson = await api("/rest/v1/lessons", {
      method: "POST",
      headers: u1Headers,
      body: { id: "hacked_lesson", title: "Hacked" },
    });
    const updateLesson = await api("/rest/v1/lessons?id=eq.isl_01", {
      method: "PATCH",
      headers: u1Headers,
      body: { title: "Defaced" },
    });
    const deleteLesson = await api("/rest/v1/lessons?id=eq.isl_01", {
      method: "DELETE",
      headers: u1Headers,
    });

    const lessonsProtected =
      !insertLesson.ok &&
      (!Array.isArray(updateLesson.data) || updateLesson.data.length === 0) &&
      (!Array.isArray(deleteLesson.data) || deleteLesson.data.length === 0);

    // Try modifying language_packs as user 1 -> all must be rejected
    const insertPack = await api("/rest/v1/language_packs", {
      method: "POST",
      headers: u1Headers,
      body: { code: "hack", name: "Hacked" },
    });
    const updatePack = await api("/rest/v1/language_packs?code=eq.en", {
      method: "PATCH",
      headers: u1Headers,
      body: { name: "Defaced" },
    });
    const deletePack = await api("/rest/v1/language_packs?code=eq.en", {
      method: "DELETE",
      headers: u1Headers,
    });

    const packsProtected =
      !insertPack.ok &&
      (!Array.isArray(updatePack.data) || updatePack.data.length === 0) &&
      (!Array.isArray(deletePack.data) || deletePack.data.length === 0);

    report(
      "6. Lessons readable; write operations on lessons & language_packs blocked",
      canReadLessons && lessonsProtected && packsProtected,
      `Lessons count: ${Array.isArray(readLessons.data) ? readLessons.data.length : 0}`
    );
  } catch (err) {
    report("6. Lessons readable; write operations on lessons & language_packs blocked", false, err.message);
  }
}

// --------------------------------------------------------------------------
// STEP 7: Guaranteed cleanup in finally block
// --------------------------------------------------------------------------
async function cleanup() {
  console.log("\n--- Cleaning up temporary test resources ---");

  // Remove uploaded test files using admin key
  if (uploadedFiles.length > 0) {
    try {
      await api("/storage/v1/object/audio", {
        method: "DELETE",
        headers: {
          ...getAdminHeaders(),
          "Content-Type": "application/json",
        },
        body: { prefixes: uploadedFiles },
      });
      console.log(`Cleaned up ${uploadedFiles.length} storage test file(s).`);
    } catch (err) {
      console.error(`Warning: Failed to delete storage test files: ${err.message}`);
    }
  }

  // Delete all users whose email starts with "rls-test-" to clear current and leftover test users
  try {
    const listRes = await api("/auth/v1/admin/users?per_page=100", {
      method: "GET",
      headers: getAdminHeaders(),
    });

    const userList = Array.isArray(listRes.data?.users)
      ? listRes.data.users
      : Array.isArray(listRes.data)
      ? listRes.data
      : [];

    const testUsers = userList.filter((u) => u.email && u.email.startsWith("rls-test-"));
    let cleanedCount = 0;
    for (const u of testUsers) {
      try {
        await api(`/auth/v1/admin/users/${u.id}`, {
          method: "DELETE",
          headers: getAdminHeaders(),
        });
        cleanedCount++;
      } catch (delErr) {
        console.error(`Warning: Failed to delete test user ${u.id}: ${delErr.message}`);
      }
    }
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} temporary test user(s) matching 'rls-test-*'.`);
    }
  } catch (listErr) {
    console.error(`Warning: Failed to list users for cleanup: ${listErr.message}`);
    // Fallback: direct deletion of user1 and user2 if list endpoint fails
    if (user1?.id) {
      try {
        await api(`/auth/v1/admin/users/${user1.id}`, {
          method: "DELETE",
          headers: getAdminHeaders(),
        });
        console.log(`Deleted temporary User 1 (${user1.id}).`);
      } catch (err) {
        console.error(`Warning: Failed to delete test User 1: ${err.message}`);
      }
    }

    if (user2?.id) {
      try {
        await api(`/auth/v1/admin/users/${user2.id}`, {
          method: "DELETE",
          headers: getAdminHeaders(),
        });
        console.log(`Deleted temporary User 2 (${user2.id}).`);
      } catch (err) {
        console.error(`Warning: Failed to delete test User 2: ${err.message}`);
      }
    }
  }

  console.log("\n==================================================");
  console.log(`Test Results Summary: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("==================================================");

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run()
  .catch((err) => {
    console.error("Unhandled test suite exception:", err);
    failCount++;
  })
  .finally(() => {
    cleanup();
  });
