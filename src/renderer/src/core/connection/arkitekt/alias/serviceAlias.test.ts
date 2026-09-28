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

  it("names the service when nothing answers", async () => {
    answering();
    await expect(
      resolveServiceAlias({ instance: instance(MESH, PUBLIC), controller: new AbortController(), routed }),
    ).rejects.toThrow("No working alias found for service: live.arkitekt.mikro");
  });
});
