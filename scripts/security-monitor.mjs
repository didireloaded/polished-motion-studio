#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DEFAULT_LIVE_URL = "https://id-preview--01804eef-1c82-496a-b1ef-dacee9edd43c.lovable.app";
const APP_URL = process.env.APP_MONITOR_URL || DEFAULT_LIVE_URL;

function run(cmd) {
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, output: out.trim() };
  } catch (err) {
    return {
      ok: false,
      output: ((err.stdout || "") + "\n" + (err.stderr || "")).trim(),
    };
  }
}

async function checkLiveUrl(url) {
  if (!url) return { skipped: true, reason: "No APP_MONITOR_URL configured" };
  try {
    const start = Date.now();
    const res = await fetch(url, { redirect: "follow" });
    const latencyMs = Date.now() - start;
    const headers = {
      contentSecurityPolicy: res.headers.get("content-security-policy"),
      xFrameOptions: res.headers.get("x-frame-options"),
      xContentTypeOptions: res.headers.get("x-content-type-options"),
      strictTransportSecurity: res.headers.get("strict-transport-security"),
    };
    return {
      ok: res.ok || res.status === 401 || res.status === 403,
      status: res.status,
      authGated: res.status === 401 || res.status === 403,
      latencyMs,
      headers,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function checkSqlRls() {
  const migrationsDir = join(ROOT, "drizzle", "migrations");
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  const unguardedTables = [];
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    const activeLines = sql
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");
    const tableMatches = [
      ...activeLines.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi),
    ];
    for (const m of tableMatches) {
      const tableName = m[1];
      const rlsRegex = new RegExp(
        `alter\\s+table\\s+public\\.${tableName}\\s+enable\\s+row\\s+level\\s+security`,
        "i",
      );
      if (!rlsRegex.test(activeLines)) {
        unguardedTables.push(`${file}: public.${tableName}`);
      }
    }
  }
  return { ok: unguardedTables.length === 0, unguardedTables };
}

function checkLeakedSecrets() {
  const res = run(
    `git grep -nE "(ghp_[A-Za-z0-9]{20,}|sb_secret_[A-Za-z0-9_]{15,}|xkeysib-[A-Za-z0-9-]{20,}|sk-live-[A-Za-z0-9]{20,})"`,
  );
  // If git grep exits 1 (not found), res.ok is false, which means 0 leaked secrets!
  if (!res.ok && !res.output) {
    return { ok: true, matches: [] };
  }
  const matches = res.output ? res.output.split("\n").filter(Boolean) : [];
  return { ok: matches.length === 0, matches };
}

async function main() {
  const headCommit = run("git rev-parse --short HEAD").output;
  const tsc = run("npx tsc --noEmit");
  const tests = run("npm test -- --run");
  const secrets = checkLeakedSecrets();
  const rls = checkSqlRls();
  const auditRaw = run("npm audit --omit=dev --json");
  let vulnerabilities = {};
  try {
    const parsed = JSON.parse(auditRaw.output);
    vulnerabilities = parsed.metadata?.vulnerabilities ?? {};
  } catch {
    vulnerabilities = { parseError: true };
  }
  const liveUrl = await checkLiveUrl(APP_URL);

  const report = {
    timestamp: new Date().toISOString(),
    headCommit,
    typescript: { ok: tsc.ok, errors: tsc.ok ? 0 : tsc.output },
    unitTests: { ok: tests.ok },
    secretScan: secrets,
    rlsCheck: rls,
    productionDependencies: vulnerabilities,
    liveEndpoint: liveUrl,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!tsc.ok || !secrets.ok || !rls.ok) {
    process.exitCode = 1;
  }
}

void main();
