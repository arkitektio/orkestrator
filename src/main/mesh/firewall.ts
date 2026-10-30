import { execFile } from "node:child_process";
import { join } from "node:path";
import type { MeshFirewallState } from "./protocol";

/**
 * What Windows Defender Firewall says about incoming traffic to meshd.
 *
 * meshd's WireGuard socket listens on every interface, so the first time it
 * starts Windows asks whether it may accept incoming connections. Either
 * answer leaves inbound rules for the exe behind, which is how we tell
 * whether the user has been asked yet ("none": not yet). Reading rules needs
 * no admin rights.
 *
 * `execFile` (no shell), an absolute
 * binary path, a literal script, a timeout. The one variable — our own
 * meshd path — goes in through the environment, never into the script text.
 */

const TIMEOUT_MS = 15_000;

// Program paths in rules may carry %VARIABLES% (rules made by hand or by
// installers), so both sides are expanded before comparing.
const SCRIPT = [
  "$p = $env:ORKESTRATOR_MESHD_PATH",
  "Get-NetFirewallApplicationFilter -ErrorAction SilentlyContinue",
  "| Where-Object { $_.Program -and ([Environment]::ExpandEnvironmentVariables($_.Program) -ieq $p) }",
  "| Get-NetFirewallRule -ErrorAction SilentlyContinue",
  "| Where-Object { $_.Direction -eq 'Inbound' -and $_.Enabled -eq 'True' }",
  "| ForEach-Object { [string]$_.Action }",
].join(" ");

/** Folds the rule actions PowerShell printed (one per line) into a state. */
export const parseFirewallActions = (stdout: string): MeshFirewallState => {
  const actions = new Set(
    stdout
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean),
  );
  const allow = actions.has("allow");
  const block = actions.has("block");
  if (allow && block) return "mixed";
  if (block) return "block";
  if (allow) return "allow";
  return "none";
};

export const windowsFirewallState = (binaryPath: string | undefined): Promise<MeshFirewallState> => {
  if (process.platform !== "win32") return Promise.resolve("not-windows");
  if (!binaryPath) return Promise.resolve("unknown");
  const powershell = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  return new Promise((resolve) => {
    execFile(
      powershell,
      ["-NoProfile", "-NonInteractive", "-Command", SCRIPT],
      { timeout: TIMEOUT_MS, windowsHide: true, env: { ...process.env, ORKESTRATOR_MESHD_PATH: binaryPath } },
      (error, stdout) => resolve(error ? "unknown" : parseFirewallActions(stdout || "")),
    );
  });
};
