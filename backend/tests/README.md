# Ishara Backend Test Suite

This folder contains automated verification and security audit scripts for the Ishara Supabase backend.

---

## 1. Secret Scanner (`scan-secrets.mjs`)

Scans all project files in `/backend` (excluding `.env`, `node_modules`, and `.git`) to ensure no sensitive credentials or keys were accidentally committed.

### How to Run:
From the `/backend` directory in Windows PowerShell:

```powershell
node .\tests\scan-secrets.mjs
```

* **Pass:** Exits with `0` and outputs `SUCCESS: No hardcoded secrets found`.
* **Fail:** Exits with `1` and lists the matching files and line numbers so you can clean them up.

---

## 2. Automated Security & RLS Test (`security-test.mjs`)

Performs an end-to-end multi-tenant security verification directly against the Supabase REST, Auth, and Storage APIs using Node's built-in `fetch` (no npm dependencies needed).

### What it verifies:
1. **User Setup:** Creates two temporary test users and logs them in.
2. **User 1 Isolation:** Confirms User 1 can create and read their own conversations, messages, and learning progress.
3. **Cross-Tenant Blocking (RLS):**
   * Confirms User 2 gets empty results when trying to view User 1's data.
   * Confirms User 2 cannot modify or delete User 1's records.
   * Confirms User 2 cannot post messages into User 1's conversation.
   * Confirms User 2 cannot spoof User 1's ID to start conversations.
   * Confirms User 2 cannot view User 1's audio storage directory.
4. **Storage Isolation:** Confirms User 1 can upload and play audio, while User 2 is strictly blocked from downloading User 1's audio.
5. **Anonymous Access:** Confirms unauthenticated callers cannot read private data, but can download `language_packs`.
6. **Read-Only Guards:** Confirms users can read `lessons`, but cannot modify `lessons` or `language_packs`.
7. **Guaranteed Cleanup:** Automatically removes the temporary audio files and deletes both test users in a `finally` block.

---

### How to Run on Windows PowerShell

Set the environment variables for your active terminal session only (never save the service role key to a file):

```powershell
# 1. Navigate to the backend directory
cd d:\SGU\ishara\backend

# 2. Set environment variables in your current PowerShell session
$env:SUPABASE_URL = "https://<PROJECT-REF>.supabase.co"
$env:SUPABASE_PUBLISHABLE_KEY = "<YOUR_ANON_KEY>"
$env:SUPABASE_SERVICE_ROLE_KEY = "<YOUR_SERVICE_ROLE_KEY>"

# 3. Run the security suite
node .\tests\security-test.mjs

# 4. (Optional) Clear the service role key from your terminal session when finished
Remove-Item Env:\SUPABASE_SERVICE_ROLE_KEY
```

> **Note:** The test runs against your linked Supabase project, creates two temporary test accounts (`rls-test-u1-...@example.com`), verifies all rules, and removes the accounts and uploaded test files before exiting.
