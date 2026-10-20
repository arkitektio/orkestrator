// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MeshFirewallState } from "../../../../../main/mesh/protocol";

/**
 * The firewall explainer: on Windows, before the first mesh starts on a
 * computer Windows has not asked yet, once; every claim waits for it in order.
 */

const { acknowledgeMeshFirewall, meshFirewallAsk, meshFirewallGate, resetMeshFirewallGate } = await import(
  "./firewallNotice"
);

let firewall: MeshFirewallState;
let unsubscribe: (() => void) | undefined;
const prompterMounted = () => {
  unsubscribe = meshFirewallAsk.subscribe(() => {});
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  firewall = "none";
  localStorage.clear();
  resetMeshFirewallGate();
  (window as unknown as { api: unknown }).api = {
    mesh: { claim: vi.fn(), firewall: async () => firewall },
  };
});

afterEach(() => {
  unsubscribe?.();
  unsubscribe = undefined;
  delete (window as unknown as { api?: unknown }).api;
});

describe("meshFirewallGate", () => {
  it("asks on Windows when no rule exists, and waits for the user", async () => {
    prompterMounted();
    let passed = false;
    void meshFirewallGate(true, "win32").then(() => (passed = true));
    await flush();
    expect(meshFirewallAsk.getSnapshot()).toBe(true);
    expect(passed).toBe(false);
    acknowledgeMeshFirewall();
    await flush();
    expect(passed).toBe(true);
    expect(meshFirewallAsk.getSnapshot()).toBe(false);
  });

  it("asks once per computer", async () => {
    prompterMounted();
    void meshFirewallGate(true, "win32");
    await flush();
    acknowledgeMeshFirewall();
    resetMeshFirewallGate();
    await meshFirewallGate(true, "win32");
    expect(meshFirewallAsk.getSnapshot()).toBe(false);
  });

  it("does not ask when Windows already asked", async () => {
    prompterMounted();
    for (const state of ["allow", "block", "mixed"] as const) {
      firewall = state;
      resetMeshFirewallGate();
      localStorage.clear();
      await meshFirewallGate(true, "win32");
      expect(meshFirewallAsk.getSnapshot()).toBe(false);
    }
  });

  it("never asks off Windows, or with nobody to show it", async () => {
    prompterMounted();
    await meshFirewallGate(true, "darwin");
    expect(meshFirewallAsk.getSnapshot()).toBe(false);
    unsubscribe?.();
    unsubscribe = undefined;
    resetMeshFirewallGate();
    await meshFirewallGate(true, "win32");
    expect(meshFirewallAsk.getSnapshot()).toBe(false);
  });

  it("keeps later claims behind the ask, in order", async () => {
    prompterMounted();
    const order: string[] = [];
    void meshFirewallGate(true, "win32").then(() => order.push("start"));
    void meshFirewallGate(false, "win32").then(() => order.push("stop"));
    await flush();
    expect(order).toEqual([]);
    acknowledgeMeshFirewall();
    await flush();
    expect(order).toEqual(["start", "stop"]);
  });
});
