import { execFile } from "node:child_process";
import { access, constants } from "node:fs/promises";
import type { MeshProbeResult, RemedyId, RemedyResult } from "./protocol";
import { isSupportedPlatform, locateTailscale, TAILSCALE_APP_PATHS } from "./tailscaleLocate";
import { parseTailscaleStatus } from "./tailscaleStatus";

/**
 * Running the Tailscale CLI, and nothing else.
 *
 * Every invocation obeys the same four rules, and they are not negotiable:
 *   1. `execFile`, never `exec` — no shell, so no quoting and no injection.
 *   2. An ABSOLUTE path from the fixed candidate list in `tailscaleLocate.ts`.
 *   3. A literal argv written in this file. Nothing from the renderer, ever —
 *      no host, no url, no user string reaches a process argument.
 *   4. A timeout, and `windowsHide`.
 *
 * `runRemedy` is reachable from the renderer, so rule 3 is what keeps that
 * safe. The remedy is an id from a closed enum; the arguments are looked up
 * here, never passed in.
 */

const STATUS_TIMEOUT_MS = 5000;
const UP_TIMEOUT_MS = 25000;

export type TailscaleDeps = {
  platform: string;
  exists: (path: string) => Promise<boolean>;
  run: (
    binary: string,
    args: readonly string[],
    timeoutMs: number,
  ) => Promise<{ code: number; stdout: string; stderr: string }>;
  openPath: (path: string) => Promise<string>;
};

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

const execFileAsync = (
  binary: string,
  args: readonly string[],
  timeoutMs: number,
): Promise<{ code: number; stdout: string; stderr: string }> =>
  new Promise((resolve) => {
    execFile(
      binary,
      [...args],
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 4_000_000 },
      (error, stdout, stderr) => {
        const code =
          error && typeof (error as { code?: unknown }).code === "number"
            ? ((error as { code: number }).code)
            : error
              ? 1
              : 0;
        resolve({ code, stdout: stdout || "", stderr: stderr || "" });
      },
    );
  });

export const defaultTailscaleDeps = (): TailscaleDeps => ({
  platform: process.platform,
  exists: fileExists,
  run: execFileAsync,
  openPath: async () => "",
});

/* ───────────────────────────────── status ─────────────────────────────── */

export const probeTailscale = async (deps: TailscaleDeps): Promise<MeshProbeResult> => {
  if (!isSupportedPlatform(deps.platform)) {
    return { vendor: "tailscale", available: false, reason: "unsupported-platform" };
  }

  const binary = await locateTailscale(deps.platform, deps.exists);
  if (!binary) {
    return { vendor: "tailscale", available: false, reason: "cli-not-found" };
  }

  const { code, stdout, stderr } = await deps.run(binary, ["status", "--json"], STATUS_TIMEOUT_MS);

  // `tailscale status` exits non-zero when the daemon is stopped or logged
  // out, but still prints usable JSON — so the output is tried first and the
  // exit code only decides what to say when there is nothing to parse.
  if (stdout.trim()) {
    const parsed = parseTailscaleStatus(stdout);
    if (parsed.available) return parsed;
  }

  return {
    vendor: "tailscale",
    available: false,
    reason: "cli-failed",
    detail: (stderr || stdout || `tailscale exited with ${code}`).trim().slice(0, 300),
  };
};

/* ──────────────────────────────── remedies ────────────────────────────── */

/**
 * The closed table of arguments. A `RemedyId` maps to a literal argv here and
 * nowhere else — this is the single place where the doctor may change the
 * state of the machine.
 */
const REMEDY_ARGS: Record<RemedyId, readonly string[] | null> = {
  "tailscale.up": ["up", "--timeout=20s"],
  "tailscale.open-app": null,
};

const LOGIN_URL = /https:\/\/login\.tailscale\.com\/[^\s"']+/;

export const runTailscaleRemedy = async (
  id: RemedyId,
  deps: TailscaleDeps,
): Promise<RemedyResult> => {
  if (id === "tailscale.open-app") {
    const appPath = TAILSCALE_APP_PATHS[deps.platform];
    if (!appPath) {
      return { ok: false, message: "Opening the Tailscale app is not supported on this system." };
    }
    const error = await deps.openPath(appPath);
    return error
      ? { ok: false, message: error }
      : { ok: true, message: "Opened Tailscale." };
  }

  const args = REMEDY_ARGS[id];
  if (!args) {
    return { ok: false, message: "That fix is not available." };
  }

  const binary = await locateTailscale(deps.platform, deps.exists);
  if (!binary) {
    return {
      ok: false,
      message:
        "The Tailscale command line tool is not installed, so this has to be done " +
        "in the Tailscale app itself.",
    };
  }

  const { code, stdout, stderr } = await deps.run(binary, args, UP_TIMEOUT_MS);
  const combined = `${stdout}\n${stderr}`;
  const loginUrl = LOGIN_URL.exec(combined)?.[0];

  if (loginUrl) {
    return {
      ok: false,
      message: "Tailscale needs you to finish signing in from your browser.",
      loginUrl,
    };
  }

  if (code !== 0) {
    // Be honest rather than optimistic: on Linux `tailscale up` usually needs
    // root, and pretending it worked is worse than saying it did not.
    return {
      ok: false,
      message:
        (stderr || stdout).trim().slice(0, 300) ||
        `Tailscale exited with code ${code}. You may need to run this yourself.`,
    };
  }

  return { ok: true, message: "Tailscale is connected." };
};
