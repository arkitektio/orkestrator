import { afterEach, describe, expect, it, vi } from "vitest";
import type { Alias, Instance } from "../fakts/faktsSchema";
import { checkAliasHealth } from "./resolve";
import { resolveServiceAlias } from "./serviceAlias";

vi.mock("./resolve", async (importOriginal) => {
  const original = await importOriginal<typeof import("./resolve")>();
  return { ...original, checkAliasHealth: vi.fn() };
});

const alias = (id: string, host: string): Alias => ({ id, host, ssl: true, challenge: "ht", port: null, path: null });
const PUBLIC = alias("pub", "mikro.example.org");
const MESH = alias("mesh", "mikro.lab.ts.net");
const instance = (...aliases: Alias[]): Instance => ({ identifier: "3", service: "live.arkitekt.mikro", aliases });
const routed = (a: Alias) => a.host.endsWith(".ts.net");

/** Which hosts answer, and a log of what was probed, in order. */
const answering = (...hosts: string[]) => {
  const probed: string[] = [];
  vi.mocked(checkAliasHealth).mockImplementation(async (a) => {
    probed.push(a.host);
    return hosts.includes(a.host);
  });
  return probed;
};

afterEach(() => vi.clearAllMocks());

describe("resolveServiceAlias", () => {
  it("keeps the alias it answered on last time, with one probe", async () => {
    const probed = answering(PUBLIC.host);
    const result = await resolveServiceAlias({ instance: instance(MESH, PUBLIC), cached: PUBLIC, controller: new AbortController(), routed });
    expect(result.id).toBe("pub");
    expect(probed).toEqual([PUBLIC.host]);
  });

  it("tries direct aliases before the mesh ones, and never waits for the mesh when one answers", async () => {
    const probed = answering(PUBLIC.host);
    const meshUp = vi.fn(async () => {});
    const result = await resolveServiceAlias({ instance: instance(MESH, PUBLIC), controller: new AbortController(), routed, meshUp });
    expect(result.id).toBe("pub");
    expect(probed).toEqual([PUBLIC.host]);
    expect(meshUp).not.toHaveBeenCalled();
  });

  it("probes a mesh alias only after the mesh is up", async () => {
    const order: string[] = [];
    vi.mocked(checkAliasHealth).mockImplementation(async (a) => {
      order.push(`probe:${a.host}`);
      return a.host === MESH.host;
    });
    const meshUp = vi.fn(async () => {
      order.push("mesh-up");
    });

    const result = await resolveServiceAlias({ instance: instance(MESH, PUBLIC), controller: new AbortController(), routed, meshUp });
    expect(result.id).toBe("mesh");
    expect(order).toEqual([`probe:${PUBLIC.host}`, "mesh-up", `probe:${MESH.host}`]);
  });

  it("waits for the mesh before re-checking a cached mesh alias", async () => {
    const order: string[] = [];
    vi.mocked(checkAliasHealth).mockImplementation(async (a) => {
      order.push(`probe:${a.host}`);
      return true;
    });
    await resolveServiceAlias({
      instance: instance(MESH),
      cached: MESH,
      controller: new AbortController(),
      routed,
      meshUp: async () => {
        order.push("mesh-up");
      },
    });
    expect(order).toEqual(["mesh-up", `probe:${MESH.host}`]);
  });

  it("does not probe the cached alias twice when it failed", async () => {
    const probed = answering(PUBLIC.host);
    await resolveServiceAlias({ instance: instance(alias("old", "old.example.org"), PUBLIC), cached: alias("old", "old.example.org"), controller: new AbortController(), routed });
    expect(probed).toEqual(["old.example.org", PUBLIC.host]);
  });

  it("narrates every probe and the wait for the mesh, in order", async () => {
    vi.mocked(checkAliasHealth).mockImplementation(async (a, timeout, _controller, onFailure) => {
      if (a.host === MESH.host) return true;
      onFailure?.({ kind: "timeout", timeoutMs: timeout });
      return false;
    });
    const events: string[] = [];
    await resolveServiceAlias({
      instance: instance(MESH, PUBLIC),
      controller: new AbortController(),
      routed,
      onAttempt: (event) =>
        events.push(`${event.state}:${event.alias.host}:${event.route}${event.state === "failed" ? `:${event.failure?.kind}` : ""}`),
      onMeshWait: (waiting) => events.push(waiting ? "wait" : "go"),
    });
    expect(events).toEqual([
      `trying:${PUBLIC.host}:direct`,
      `failed:${PUBLIC.host}:direct:timeout`,
      "wait",
      "go",
      `trying:${MESH.host}:mesh`,
      `ok:${MESH.host}:mesh`,
    ]);
  });

  it("names the service when nothing answers", async () => {
    answering();
    await expect(
      resolveServiceAlias({ instance: instance(MESH, PUBLIC), controller: new AbortController(), routed }),
    ).rejects.toThrow("No working alias found for service: live.arkitekt.mikro");
  });
});

describe("a strict instance (its hub registered a certificate)", () => {
  const plain = (id: string, host: string): Alias => ({ ...alias(id, host), ssl: false });
  const strict = (...aliases: Alias[]): Instance => ({
    ...instance(...aliases),
    tls: { certificates: ["-----BEGIN CERTIFICATE-----\nAA==\n-----END CERTIFICATE-----"] },
  });
  const TLS = alias("lab", "lab.local");
  const PLAIN = plain("lab+http", "lab.local");
  const PLAIN_MESH = plain("mesh", "mikro.lab.ts.net");

  it("never uses a plain alias off the mesh, even when it is the only one answering", async () => {
    const probed = answering(PLAIN.host);
    vi.mocked(checkAliasHealth).mockImplementation(async (a) => {
      probed.push(`${a.id}`);
      return !a.ssl;
    });
    await expect(
      resolveServiceAlias({ instance: strict(TLS, PLAIN), controller: new AbortController(), routed }),
    ).rejects.toThrow("No working alias");
    expect(probed).toEqual(["lab"]);
  });

  it("uses a plain alias that goes through the mesh", async () => {
    answering(PLAIN_MESH.host);
    const result = await resolveServiceAlias({ instance: strict(TLS, PLAIN, PLAIN_MESH), controller: new AbortController(), routed });
    expect(result.id).toBe("mesh");
  });

  it("drops a cached plain alias from before the hub became strict", async () => {
    const probed = answering(TLS.host);
    const result = await resolveServiceAlias({ instance: strict(TLS, PLAIN), cached: PLAIN, controller: new AbortController(), routed });
    expect(result.id).toBe("lab");
    expect(probed).toEqual([TLS.host]);
  });

  it("leaves a plain-HTTP hub alone", async () => {
    answering(PLAIN.host);
    const result = await resolveServiceAlias({ instance: instance(PLAIN), controller: new AbortController(), routed });
    expect(result.id).toBe("lab+http");
  });
});
