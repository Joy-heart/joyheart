import { spawn, spawnSync } from "node:child_process";
import { access, copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const routeDir = resolve(root, "app/api/round5b-worker-test");
const routeFile = resolve(routeDir, "route.ts");
const fixture = resolve(root, "tests/worker-runtime/photo-validation-route.ts");
const url = "http://localhost:5173/api/round5b-worker-test";
let server;
let serverLog = "";

try {
  try { await access(routeDir, constants.F_OK); throw new Error("Temporary Worker test route already exists; refusing to overwrite it."); }
  catch (error) { if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error; }
  await mkdir(routeDir, { recursive: false });
  await copyFile(fixture, routeFile);

  const isWindows = process.platform === "win32";
  const command = process.execPath;
  const args = [resolve(root, "node_modules/vinext/dist/cli.js"), "dev", "--host", "127.0.0.1", "--port", "5173"];
  server = spawn(command, args, {
    cwd: root,
    env: { ...process.env, NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"],
    detached: !isWindows,
    windowsHide: true,
  });
  server.stdout?.on("data", (chunk) => { serverLog = (serverLog + chunk.toString()).slice(-6000); });
  server.stderr?.on("data", (chunk) => { serverLog = (serverLog + chunk.toString()).slice(-6000); });

  const deadline = Date.now() + 180_000;
  let response;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("Vinext/Cloudflare dev server exited early.\n" + serverLog);
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (response.status === 200) break;
      const body = await response.text();
      if (response.status !== 404) throw new Error("Worker runtime test returned HTTP " + response.status + ": " + body);
    } catch (error) {
      if (error instanceof Error && !/fetch failed|ECONNREFUSED|terminated|aborted/i.test(error.message)) throw error;
    }
    await delay(500);
  }
  if (!response || response.status !== 200) throw new Error("Worker runtime test did not become ready within 180 seconds.\n" + serverLog);

  const result = await response.json();
  if (!result.success || result.results?.length !== 3 || result.rejectedCases?.length !== 10 || result.metadataStripped !== true) {
    throw new Error("Worker runtime test evidence was incomplete: " + JSON.stringify(result));
  }

  const origin = "http://localhost:5173";
  const csrfResponse = await fetch(origin + "/api/profile-photos", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  const staffCsrfResponse = await fetch(origin + "/api/staff/photos/review", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  const deleteCsrfResponse = await fetch(origin + "/api/profile-photos/not-a-uuid", {
    method: "DELETE", headers: { "Content-Type": "application/json" },
  });
  const invalidContentTypeResponse = await fetch(origin + "/api/profile-photos", {
    method: "POST",
    headers: { "Origin": origin, "Content-Type": "application/json" },
    body: "{}",
  });
  const invalidMemberResponse = await fetch(origin + "/api/profile-photos/member/not-a-uuid");
  if (csrfResponse.status !== 403 || staffCsrfResponse.status !== 403 || deleteCsrfResponse.status !== 403
      || invalidContentTypeResponse.status !== 400 || invalidMemberResponse.status !== 404) {
    throw new Error("Photo API boundary tests failed: " + JSON.stringify({
      uploadCsrf: csrfResponse.status, staffCsrf: staffCsrfResponse.status,
      deleteCsrf: deleteCsrfResponse.status, contentType: invalidContentTypeResponse.status,
      memberId: invalidMemberResponse.status,
    }));
  }
  result.apiBoundary = {
    uploadCrossOriginPost: csrfResponse.status,
    staffCrossOriginPost: staffCsrfResponse.status,
    deleteCrossOriginPost: deleteCsrfResponse.status,
    unsupportedContentType: invalidContentTypeResponse.status,
    invalidMemberId: invalidMemberResponse.status,
  };

  const evidenceDir = resolve(root, "artifacts");
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(resolve(evidenceDir, "photo-worker-runtime-evidence.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (server && server.exitCode === null) {
    try {
      if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
      else process.kill(-server.pid, "SIGTERM");
    } catch {}
  }
  await rm(routeDir, { recursive: true, force: true });
}
