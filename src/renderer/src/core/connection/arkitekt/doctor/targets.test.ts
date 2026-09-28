import { describe, expect, it } from "vitest";
import { aliasToHttpPath } from "../alias/helpers";
import type { Alias, Instance } from "../fakts/faktsSchema";
import {
  aliasToProbeTarget,
  isUpstream,
  upstreamTargets,
  endpointToProbeTargets,
  instanceToProbeTargets,
  probeTargetUrl,
} from "./targets";

const alias = (overrides: Partial<Alias> = {}): Alias => ({
  id: "a1",
  host: "mikro.tailnet-cafe.ts.net",
  port: 443,
  ssl: true,
  path: null,
  challenge: ".well-known/fakts-challenge",
  ...overrides,
});

describe("aliasToProbeTarget", () => {
  it("carries host, port, ssl, path and the challenge", () => {
    expect(aliasToProbeTarget(alias({ path: "mikro" }), "mikro")).toEqual({
      host: "mikro.tailnet-cafe.ts.net",
      port: 443,
      ssl: true,
      path: "mikro",
      probePath: ".well-known/fakts-challenge",
      label: "mikro",
      role: "service",
    });
  });

  it("normalises a missing port and path to null", () => {
    const target = aliasToProbeTarget(alias({ port: undefined, path: undefined }), "x");
    expect(target.port).toBeNull();
    expect(target.path).toBeNull();
  });
});

describe("probeTargetUrl", () => {
  it("agrees with the url resolveWorkingAlias actually tries", () => {
    // This is the whole point of the module: same helper, same string.
    for (const candidate of [
      alias(),
      alias({ ssl: false, port: 8080 }),
      alias({ port: null, path: "mikro" }),
      alias({ host: "100.64.0.2", port: 80, ssl: false }),
    ]) {
      const expected = aliasToHttpPath(candidate, candidate.challenge);
      expect(probeTargetUrl(aliasToProbeTarget(candidate, "l"))).toBe(expected);
    }
  });
});

describe("instanceToProbeTargets", () => {
  const instance = (aliases: Alias[]): Instance => ({
    identifier: "live.arkitekt.mikro",
    service: "live.arkitekt.mikro",
    aliases,
  });

  it("numbers the aliases when there is more than one", () => {
    const targets = instanceToProbeTargets("mikro", instance([alias(), alias({ id: "a2" })]));
    expect(targets.map((target) => target.label)).toEqual([
      "mikro alias 1 of 2",
      "mikro alias 2 of 2",
    ]);
  });

  it("uses the bare service key for a single alias", () => {
    expect(instanceToProbeTargets("mikro", instance([alias()]))[0].label).toBe("mikro");
  });
});

describe("endpointToProbeTargets", () => {
  it("tries https and http when no scheme was given, like discover does", () => {
    const targets = endpointToProbeTargets("go.arkitekt.live");
    expect(targets.map((target) => target.ssl)).toEqual([true, false]);
    expect(targets.every((target) => target.probePath === ".well-known/fakts")).toBe(true);
    expect(targets[0].host).toBe("go.arkitekt.live");
  });

  it("honours an explicit scheme and keeps just that one", () => {
    const targets = endpointToProbeTargets("http://localhost:8000");
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({ host: "localhost", port: 8000, ssl: false });
  });

  it("keeps a path prefix", () => {
    expect(endpointToProbeTargets("https://example.com/hub/")[0].path).toBe("hub");
  });

  it("returns nothing for empty or unparseable input", () => {
    expect(endpointToProbeTargets("")).toEqual([]);
    expect(endpointToProbeTargets("   ")).toEqual([]);
    expect(endpointToProbeTargets("http://")).toEqual([]);
  });
});

describe("upstreamTargets", () => {
  it("probes lok's own alias on the coordination server, challenge and all", () => {
    const targets = upstreamTargets({
      kind: "service",
      serviceKey: "all",
      endpointUrl: "https://go.arkitekt.live/lok/f/",
      coordinationAlias: { id: "self", host: "go.arkitekt.live", ssl: true, path: "lok", challenge: "ht" },
    });
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({ role: "coordination", host: "go.arkitekt.live", path: "lok", probePath: "ht" });
    expect(probeTargetUrl(targets[0])).toBe("https://go.arkitekt.live/lok/ht");
  });

  it("without the alias, falls back to discovery at the ORIGIN — never under base_url", () => {
    // base_url is the fakts API (…/lok/f/); `/lok/f/.well-known/fakts` is served by nothing.
    const [target] = upstreamTargets({ kind: "service", serviceKey: "all", endpointUrl: "https://go.arkitekt.live/lok/f/" });
    expect(probeTargetUrl(target)).toBe("https://go.arkitekt.live/.well-known/fakts");
  });

  it("probes the coordination server's discovery and the mesh control root in service mode", () => {
    const targets = upstreamTargets({
      kind: "service",
      serviceKey: "all",
      endpointUrl: "https://go.arkitekt.live",
      meshCoordUrl: "https://mesh.arkitekt.live",
    });
    expect(targets.map((target) => [target.role, target.host, target.probePath])).toEqual([
      ["coordination", "go.arkitekt.live", ".well-known/fakts"],
      ["mesh-control", "mesh.arkitekt.live", null],
    ]);
    expect(targets.every(isUpstream)).toBe(true);
  });

  it("adds no mesh control when the deployment names none or it is unknown", () => {
    for (const meshCoordUrl of [null, undefined]) {
      const targets = upstreamTargets({ kind: "service", serviceKey: "x", endpointUrl: "https://go.arkitekt.live", meshCoordUrl });
      expect(targets.map((target) => target.role)).toEqual(["coordination"]);
    }
  });

  it("adds nothing in discovery mode, whose targets already are the coordination server", () => {
    expect(upstreamTargets({ kind: "discovery", endpointUrl: "https://go.arkitekt.live" })).toEqual([]);
  });
});
