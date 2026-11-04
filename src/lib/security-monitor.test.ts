import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const script = resolve(process.cwd(), "scripts/security-monitor.mjs");
const server = createServer((request, response) => {
  response.writeHead(request.url === "/gated" ? 401 : 200);
  response.end("fixture");
});
let endpoint = "";

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fixture server unavailable");
  endpoint = `http://127.0.0.1:${address.port}`;
});
afterAll(
  () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    ),
);

const syntheticToken = `ghp_${"A".repeat(36)}`;

async function runMonitor(
  options: {
    testExit?: number;
    audit?: string;
    leaked?: boolean;
    supabaseUnguarded?: boolean;
    gated?: boolean;
  } = {},
) {
  const directory = mkdtempSync(join(tmpdir(), "mutal-monitor-fixture-"));
  try {
    const bin = join(directory, "bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "npx"), "#!/bin/sh\nexit 0\n");
    writeFileSync(
      join(bin, "npm"),
      '#!/bin/sh\ncase "$1" in\n audit) printf "%s\\n" "$MONITOR_TEST_AUDIT";;\n test) exit "$MONITOR_TEST_EXIT";;\nesac\n',
    );
    chmodSync(join(bin, "npx"), 0o755);
    chmodSync(join(bin, "npm"), 0o755);
    mkdirSync(join(directory, "drizzle", "migrations"), { recursive: true });
    writeFileSync(
      join(directory, "drizzle", "migrations", "0000.sql"),
      "CREATE TABLE public.profiles (id uuid); ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;",
    );
    writeFileSync(
      join(directory, "fixture.txt"),
      options.leaked ? syntheticToken : "ordinary content",
    );
    if (options.supabaseUnguarded) {
      mkdirSync(join(directory, "supabase", "migrations"), { recursive: true });
      writeFileSync(
        join(directory, "supabase", "migrations", "0001.sql"),
        "CREATE TABLE public.unguarded (id uuid);",
      );
    }
    execFileSync("git", ["init", "--quiet"], { cwd: directory });
    execFileSync("git", ["add", "fixture.txt", "drizzle"], { cwd: directory });
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "fixture",
      ],
      { cwd: directory },
    );
    return await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
      const processUnderTest = spawn(process.execPath, [script], {
        cwd: directory,
        env: {
          ...process.env,
          PATH: `${bin}:${process.env["PATH"] ?? ""}`,
          APP_MONITOR_URL: endpoint + (options.gated ? "/gated" : "/"),
          MONITOR_TEST_EXIT: String(options.testExit ?? 0),
          MONITOR_TEST_AUDIT:
            options.audit ??
            JSON.stringify({ metadata: { vulnerabilities: { high: 0, critical: 0 } } }),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      processUnderTest.stdout.on("data", (data) => {
        output += data.toString();
      });
      processUnderTest.on("error", reject);
      processUnderTest.on("close", (code) => resolve({ code, output }));
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("security monitor reporting", () => {
  it("reports a successful run without claiming live RLS authorization verification", async () => {
    const result = await runMonitor();
    const report = JSON.parse(result.output);
    expect(result.code).toBe(0);
    expect(report.ok).toBe(true);
    expect(report.rlsCheck.livePoliciesVerified).toBe(false);
  });

  it("reports the source filename without leaking a detected credential", async () => {
    const result = await runMonitor({ leaked: true });
    expect(result.code).toBe(1);
    expect(result.output).not.toContain(syntheticToken);
    expect(JSON.parse(result.output).secretScan.matches).toEqual(["fixture.txt"]);
  });

  it("fails the run when unit tests fail", async () => {
    const result = await runMonitor({ testExit: 1 });
    expect(result.code).toBe(1);
    expect(JSON.parse(result.output).unitTests.ok).toBe(false);
  });

  it.each([
    "not JSON",
    JSON.stringify({ metadata: { vulnerabilities: { high: 1, critical: 0 } } }),
    JSON.stringify({
      error: { code: "NETWORK" },
      metadata: { vulnerabilities: { high: 0, critical: 0 } },
    }),
  ])("fails when the dependency audit cannot establish an acceptable result", async (audit) => {
    const result = await runMonitor({ audit });
    expect(result.code).toBe(1);
    expect(JSON.parse(result.output).productionDependencies.ok).toBe(false);
  });

  it("does not label an auth-gated endpoint as a healthy public app", async () => {
    const result = await runMonitor({ gated: true });
    const report = JSON.parse(result.output);
    expect(result.code).toBe(1);
    expect(report.liveEndpoint.authGated).toBe(true);
    expect(report.liveEndpoint.ok).toBe(false);
  });
  it("checks Supabase migrations as well as Drizzle migrations", async () => {
    const result = await runMonitor({ supabaseUnguarded: true });
    const report = JSON.parse(result.output);
    expect(result.code).toBe(1);
    expect(report.rlsCheck.sources).toContain("supabase/migrations");
    expect(report.rlsCheck.unguardedTables).toContain(
      "supabase/migrations/0001.sql: public.unguarded",
    );
  });
});
