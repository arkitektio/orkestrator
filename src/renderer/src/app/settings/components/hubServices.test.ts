import { describe, expect, it } from "vitest";
import type { ServiceRuntimeState } from "@/core/connection/arkitekt/types";
import { connectionProfile, serviceLink, splitServices } from "./hubServices";

const service = (key: string, configured: boolean, optional = true) =>
  ({ key, configured, definition: { key, optional }, status: configured ? "ready" : "unconfigured", errors: [] }) as unknown as ServiceRuntimeState;

describe("the hub's services", () => {
  it("lists what the hub granted and a required one it did not; folds away the optional rest", () => {
    const { listed, notGranted } = splitServices([
      service("mikro", true),
      service("kraph", false),
      service("lok", false, false),
      service("alpaka", true),
    ]);
    expect(listed.map((s) => s.key)).toEqual(["alpaka", "lok", "mikro"]);
    expect(notGranted.map((s) => s.key)).toEqual(["kraph"]);
  });

  it("links a service's page under the hub", () => {
    expect(serviceLink("mikro")).toBe("/settings/hub/mikro");
  });

  it("says in one line how a service is reached", () => {
    expect(connectionProfile({ kind: "direct", network: "public" }, true).line).toBe("Encrypted · direct over the internet");
    expect(connectionProfile({ kind: "direct", network: "public" }, false)).toEqual({
      line: "Unencrypted · direct over the internet",
      tone: "bad",
    });
    expect(
      connectionProfile(
        { kind: "mesh", meshLabel: "lab", peer: { name: "hub", online: true, path: { kind: "direct", address: "1.2.3.4:41641" } } },
        false,
      ).line,
    ).toBe("Encrypted · mesh, direct tunnel");
    expect(
      connectionProfile({ kind: "mesh", meshLabel: "lab", peer: { name: "hub", online: true, path: { kind: "relay", region: "fra" } } }, false),
    ).toEqual({ line: "Encrypted · mesh, routed via fra", tone: "warn" });
    expect(connectionProfile({ kind: "direct", network: "mesh-down" }, true).tone).toBe("bad");
  });
});
