// Ishara: Secret Scanner Script
// Scans the /backend folder (excluding .env, node_modules, and .git) for leaked credentials
// Usage: node ./tests/scan-secrets.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");

// Patterns for potential secrets
const SECRET_RULES = [
  {
    name: "JWT Token (starts with eyJ...)",
    regex: /\b(eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,})\b/g,
  },
  {
    name: "Supabase Secret Key (starts with sb_secret_...)",
    regex: /\b(sb_secret_[a-zA-Z0-9_-]{16,})\b/g,
  },
  {
    name: "Service Role Key (service_role followed by long key)",
    regex: /service_role[^\w\n]{1,20}([a-zA-Z0-9._-]{30,})/gi,
  },
];

// Folders and files to strictly ignore
const IGNORED_NAMES = new Set([
  "node_modules",
  ".git",
  ".temp",
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  "package-lock.json", // Contains integrity hashes that start with specific patterns
]);

// Text file extensions to inspect
const SCANNABLE_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".json",
  ".sql",
  ".md",
  ".toml",
  ".yaml",
  ".yml",
  ".txt",
  ".sh",
]);

const findings = [];

function scanDirectory(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.warn(`Could not read directory: ${dir} (${err.message})`);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(backendRoot, fullPath);

    // Skip ignored directories/files
    if (IGNORED_NAMES.has(entry.name) || entry.name.startsWith(".env")) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      // Scan only known text/source extensions
      if (SCANNABLE_EXTENSIONS.has(ext)) {
        scanFile(fullPath, relativePath);
      }
    }
  }
}

function scanFile(filePath, relativePath) {
  // Do not flag the scan script or test script themselves for their regex patterns
  if (relativePath.replace(/\\/g, "/") === "tests/scan-secrets.mjs") {
    return;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return;
  }

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments in test scripts or documentation explaining placeholders
    if (line.includes("YOUR_") || line.includes("<") || line.includes("placeholder") || line.includes("example")) {
      continue;
    }

    for (const rule of SECRET_RULES) {
      rule.regex.lastIndex = 0;
      let match;
      while ((match = rule.regex.exec(line)) !== null) {
        const secret = match[1] || match[0];
        // Redact most of the secret for display
        const redacted = secret.length > 12
          ? `${secret.slice(0, 6)}...${secret.slice(-4)}`
          : "***";

        findings.push({
          file: relativePath,
          line: i + 1,
          rule: rule.name,
          redacted,
        });
      }
    }
  }
}

console.log("==================================================");
console.log("Scanning /backend for hardcoded secrets...");
console.log(`Scanning root: ${backendRoot}`);
console.log("Ignored: .env*, node_modules/, .git/");
console.log("==================================================\n");

scanDirectory(backendRoot);

if (findings.length === 0) {
  console.log("SUCCESS: No hardcoded secrets found in scanned files.");
  process.exit(0);
} else {
  console.error(`WARNING: Found ${findings.length} potential secret(s) in committed/trackable files:\n`);
  for (const f of findings) {
    console.error(`  - ${f.file}:${f.line} [${f.rule}] (Sample: ${f.redacted})`);
  }
  console.error("\nPlease move any hardcoded keys into local.properties or your private .env file!");
  process.exit(1);
}
