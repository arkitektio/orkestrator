import { describe, expect, it, vi } from "vitest";
import { probeTailscale, runTailscaleRemedy, type TailscaleDeps } from "./tailscale";

const STATUS = JSON.stringify({
  BackendState: "Running",
  MagicDNSSuffix: "tailnet-cafe.ts.net",
  Self: { HostName: "laptop", TailscaleIPs: ["100.64.0.1"], Online: true },
  Peer: {},
});

const deps = (overrides: Partial<TailscaleDeps> = {}): TailscaleDeps => ({
  platform: "darwin",
  exists: async (path) => path === "/usr/local/bin/tailscale",
  run: vi.fn(async () => ({ code: 0, stdout: STATUS, stderr: "" })),
  openPath: vi.fn(async () => ""),
  ...overrides,
});

describe("probeTailscale", () => {
  it("runs `status --json` against the located binary", async () => {
    const run = vi.fn(async () => ({ code: 0, stdout: STATUS, stderr: "" }));
    const result = await probeTailscale(deps({ run }));

    expect(run).toHaveBeenCalledWith("/usr/local/bin/tailscale", ["status", "--json"], 5000);
    expect(result.available).toBe(true);
    if (!result.available) throw new Error("unreachable");
    expect(result.backendState).toBe("Running");
  });

  it("reports a missing CLI as a normal outcome, without running anything", async () => {
    const run = vi.fn();
    const result = await probeTailscale(deps({ exists: async () => false, run: run as never }));

    expect(run).not.toHaveBeenCalled();
    expect(result).toEqual({ vendor: "tailscale", available: false, reason: "cli-not-found" });
  });

  it("reports an unsupported platform without looking for a binary", async () => {
    const exists = vi.fn(async () => true);
    const result = await probeTailscale(deps({ platform: "aix", exists }));

    expect(exists).not.toHaveBeenCalled();
    expect(result).toMatchObject({ available: false, reason: "unsupported-platform" });
  });

  it("still parses the JSON when the CLI exits non-zero, because a logged-out daemon does", async () => {
    const stdout = JSON.stringify({ BackendState: "NeedsLogin", Peer: {} });
    const result = await probeTailscale(
      deps({ run: async () => ({ code: 1, stdout, stderr: "not logged in" }) }),
    );

    expect(result.available).toBe(true);
    if (!result.available) throw new Error("unreachable");
    expect(result.backendState).toBe("NeedsLogin");
  });

  it("falls back to cli-failed when there is nothing to parse", async () => {
    const result = await probeTailscale(
      deps({ run: async () => ({ code: 1, stdout: "", stderr: "permission denied" }) }),
    );
    expect(result).toMatchObject({ available: false, reason: "cli-failed" });
    if (result.available) throw new Error("unreachable");
    expect(result.detail).toContain("permission denied");
  });
});

describe("runTailscaleRemedy", () => {
  it("runs a literal argv, with no input of any kind", async () => {
    const run = vi.fn(async () => ({ code: 0, stdout: "", stderr: "" }));
    const result = await runTailscaleRemedy("tailscale.up", deps({ run }));

    expect(run).toHaveBeenCalledWith("/usr/local/bin/tailscale", ["up", "--timeout=20s"], 25000);
    expect(result.ok).toBe(true);
  });

  it("surfaces the login URL rather than claiming success", async () => {
    const stdout =
      "To authenticate, visit:\n\n\thttps://login.tailscale.com/a/abc123def\n\n";
    const result = await runTailscaleRemedy(
      "tailscale.up",
      deps({ run: async () => ({ code: 0, stdout, stderr: "" }) }),
    );

    expect(result.ok).toBe(false);
    expect(result.loginUrl).toBe("https://login.tailscale.com/a/abc123def");
    expect(result.message).toContain("signing in");
  });

  it("is honest about a failure instead of pretending it worked", async () => {
    const result = await runTailscaleRemedy(
      "tailscale.up",
      deps({ run: async () => ({ code: 1, stdout: "", stderr: "access denied: needs root" }) }),
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain("needs root");
  });

  it("says so when there is no CLI to run the fix with", async () => {
    const run = vi.fn();
    const result = await runTailscaleRemedy(
      "tailscale.up",
      deps({ exists: async () => false, run: run as never }),
    );
    expect(run).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("not installed");
  });

  it("opens the app without spawning a process", async () => {
    const run = vi.fn();
    const openPath = vi.fn(async () => "");
    const result = await runTailscaleRemedy(
      "tailscale.open-app",
      deps({ run: run as never, openPath }),
    );

    expect(run).not.toHaveBeenCalled();
    expect(openPath).toHaveBeenCalledWith("/Applications/Tailscale.app");
    expect(result.ok).toBe(true);
  });

  it("declines to open the app where there is none", async () => {
    const result = await runTailscaleRemedy("tailscale.open-app", deps({ platform: "linux" }));
    expect(result.ok).toBe(false);
  });
});
