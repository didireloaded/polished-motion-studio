#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DEFAULT_LIVE_URL = "https://motion-polish-playground.lovable.app";
const APP_URL = process.env.APP_MONITOR_URL || DEFAULT_LIVE_URL;

function run(cmd) {
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, exitCode: 0, output: out.trim() };
  } catch (err) {
    return {
      ok: false,
      exitCode: typeof err.status === "number" ? err.status : null,
      output: ((err.stdout || "") + "\n" + (err.stderr || "")).trim(),
    };
  }
}

async function checkLiveUrl(url) {
  if (!url) return { skipped: true, reason: "No APP_MONITOR_URL configured" };
  try {
    const start = Date.now();
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
    const latencyMs = Date.now() - start;
    const headers = {
      contentSecurityPolicy: res.headers.get("content-security-policy"),
      xFrameOptions: res.headers.get("x-frame-options"),
      xContentTypeOptions: res.headers.get("x-content-type-options"),
      strictTransportSecurity: res.headers.get("strict-transport-security"),
    };
    return {
      ok: res.ok,
      status: res.status,
      authGated: res.status === 401 || res.status === 403,
      latencyMs,
      headers,
    };
  } catch (err) {
    return {
      ok: false,
      error: "Live endpoint request failed",
    };
  }
}

function checkSqlRls() {
  const sources = ["drizzle/migrations", "supabase/migrations", "supabase"].filter((directory) =>
    existsSync(join(ROOT, directory)),
  );
  const files = sources.flatMap((directory) =>
    readdirSync(join(ROOT, directory))
      .filter((name) => name.endsWith(".sql"))
      .map((name) => join(directory, name)),
  );
  const unguardedTables = [];
  for (const file of files) {
    const sql = readFileSync(join(ROOT, file), "utf8");
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
  return {
    ok: unguardedTables.length === 0,
    method: "static-rls-enablement-heuristic",
    sources,
    livePoliciesVerified: false,
    unguardedTables,
  };
}

function checkLeakedSecrets() {
  const res = run(
    `git grep -lE "(ghp_[A-Za-z0-9]{20,}|sb_secret_[A-Za-z0-9_]{15,}|xkeysib-[A-Za-z0-9-]{20,}|sk-live-[A-Za-z0-9]{20,})"`,
  );
  // Report filenames only; matching source lines could contain real credentials.
  if (res.exitCode === 1) return { ok: true, matches: [], scope: "tracked files" };
  if (!res.ok) return { ok: false, matches: [], error: "Secret scan could not complete" };
  const matches = res.output ? res.output.split("\n").filter(Boolean) : [];
  return { ok: matches.length === 0, matches, scope: "tracked files" };
}

async function main() {
  const headCommit = run("git rev-parse --short HEAD").output;
  const tsc = run("npx tsc --noEmit");
  const tests = run("npm test -- --run");
  const secrets = checkLeakedSecrets();
  const rls = checkSqlRls();
  const auditRaw = run("npm audit --omit=dev --json");
  let dependencies;
  try {
    const parsed = JSON.parse(auditRaw.output);
    const vulnerabilities = parsed.metadata?.vulnerabilities;
    if (
      !vulnerabilities ||
      !Number.isFinite(vulnerabilities.high) ||
      !Number.isFinite(vulnerabilities.critical)
    ) {
      throw new Error("Missing audit summary");
    }
    dependencies = {
      ok:
        !parsed.error &&
        (auditRaw.exitCode === 0 || auditRaw.exitCode === 1) &&
        vulnerabilities.high === 0 &&
        vulnerabilities.critical === 0,
      threshold: "high or critical",
      vulnerabilities,
    };
  } catch {
    dependencies = { ok: false, error: "Dependency audit could not be read" };
  }
  const liveUrl = await checkLiveUrl(APP_URL);

  const ok = tsc.ok && tests.ok && secrets.ok && rls.ok && dependencies.ok && liveUrl.ok === true;
  const report = {
    ok,
    timestamp: new Date().toISOString(),
    headCommit,
    typescript: {
      ok: tsc.ok,
      ...(tsc.ok ? {} : { error: "TypeScript check failed; inspect local diagnostics." }),
    },
    unitTests: { ok: tests.ok },
    secretScan: secrets,
    rlsCheck: rls,
    productionDependencies: dependencies,
    liveEndpoint: liveUrl,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!ok) {
    process.exitCode = 1;
  }
}

void main();
