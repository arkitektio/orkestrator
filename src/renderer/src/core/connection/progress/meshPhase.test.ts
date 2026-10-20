import { describe, expect, it } from "vitest";
import type { MeshStatusPayload } from "../../../../../main/mesh/protocol";
import { meshProgressFor } from "./meshPhase";

const MESH = { id: "lab", label: "Lab", controlUrl: "https://mesh.example.org", hosts: [], enabled: true };
const payload = (sidecar: MeshStatusPayload["sidecar"], state?: string, error?: string): MeshStatusPayload => ({
  sidecar,
  meshes: state
    ? [{ config: { id: "lab", label: "Lab", controlUrl: MESH.controlUrl, hosts: [], hasNodeState: true }, status: { id: "lab", state, error } as never }]
    : [],
});
const phase = (p: MeshStatusPayload | undefined, demandedBy: string[] = ["mikro"], askingFirewall = false) =>
  meshProgressFor({ mesh: MESH, payload: p, askingFirewall, demandedBy })?.phase;

describe("meshProgressFor", () => {
  it("says nothing about a mesh nobody asked for", () => {
    expect(phase(payload({ state: "idle" }), [])).toBeUndefined();
    expect(meshProgressFor({ mesh: { ...MESH, enabled: false }, payload: undefined, askingFirewall: false, demandedBy: ["x"] })).toBeUndefined();
  });

  it("walks firewall → client → joining → running", () => {
    expect(phase(payload({ state: "idle" }), ["mikro"], true)).toBe("firewall");
    expect(phase(payload({ state: "starting" }))).toBe("starting-client");
    expect(phase(payload({ state: "ready", version: "1" }, "starting"))).toBe("joining");
    expect(phase(payload({ state: "ready", version: "1" }, "running"))).toBe("running");
  });

  it("names where it is stuck", () => {
    expect(phase(payload({ state: "ready", version: "1" }, "needs-machine-auth"))).toBe("needs-machine-auth");
    expect(phase(payload({ state: "ready", version: "1" }, "needs-login"))).toBe("needs-login");
    expect(phase(payload({ state: "unavailable", reason: "binary-missing" }))).toBe("unavailable");
    expect(meshProgressFor({ mesh: MESH, payload: payload({ state: "ready", version: "1" }, "error", "boom"), askingFirewall: false, demandedBy: ["x"] })).toMatchObject({ phase: "failed", detail: "boom" });
  });
});
