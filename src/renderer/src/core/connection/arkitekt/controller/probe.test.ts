import { afterEach, describe, expect, it, vi } from "vitest";
import type { Alias, Instance } from "../fakts/faktsSchema";
import { checkAliasHealth } from "../alias/resolve";
import { probeService } from "./probe";

vi.mock("../alias/resolve", async (importOriginal) => {
  const original = await importOriginal<typeof import("../alias/resolve")>();
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

describe("probeService", () => {
  it("keeps the alias it answered on last time, with one probe", async () => {
    const probed = answering(PUBLIC.host);
    const result = await probeService({ instance: instance(MESH, PUBLIC), cached: PUBLIC, controller: new AbortController(), routed });
    expect(result.id).toBe("pub");
    expect(probed).toEqual([PUBLIC.host]);
  });

  it("tries direct aliases before the mesh ones, and never waits for the mesh when one answers", async () => {
    const probed = answering(PUBLIC.host);
    const meshUp = vi.fn(async () => {});
    const result = await probeService({ instance: instance(MESH, PUBLIC), controller: new AbortController(), routed, meshUp });
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

    const result = await probeService({ instance: instance(MESH, PUBLIC), controller: new AbortController(), routed, meshUp });
    expect(result.id).toBe("mesh");
    expect(order).toEqual([`probe:${PUBLIC.host}`, "mesh-up", `probe:${MESH.host}`]);
  });

  it("waits for the mesh before re-checking a cached mesh alias", async () => {
    const order: string[] = [];
    vi.mocked(checkAliasHealth).mockImplementation(async (a) => {
      order.push(`probe:${a.host}`);
      return true;
    });
    await probeService({
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
    await probeService({ instance: instance(alias("old", "old.example.org"), PUBLIC), cached: alias("old", "old.example.org"), controller: new AbortController(), routed });
    expect(probed).toEqual(["old.example.org", PUBLIC.host]);
  });

  it("narrates every probe and the wait for the mesh, in order", async () => {
    vi.mocked(checkAliasHealth).mockImplementation(async (a, timeout, _controller, onFailure) => {
      if (a.host === MESH.host) return true;
      onFailure?.({ kind: "timeout", timeoutMs: timeout });
      return false;
    });
    const events: string[] = [];
    await probeService({
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
      probeService({ instance: instance(MESH, PUBLIC), controller: new AbortController(), routed }),
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

  it("never uses a plain LAN alias, even when it is the only one answering", async () => {
    const probed = answering(PLAIN.host);
    vi.mocked(checkAliasHealth).mockImplementation(async (a) => {
      probed.push(`${a.id}`);
      return !a.ssl;
    });
    await expect(
      probeService({ instance: strict(TLS, PLAIN), controller: new AbortController(), routed }),
    ).rejects.toThrow("No working alias");
    expect(probed).toEqual(["lab"]);
  });

  it("uses a plain alias that goes through the mesh", async () => {
    answering(PLAIN_MESH.host);
    const result = await probeService({ instance: strict(TLS, PLAIN, PLAIN_MESH), controller: new AbortController(), routed });
    expect(result.id).toBe("mesh");
  });

  it("drops a cached plain alias from before the hub became strict", async () => {
    const probed = answering(TLS.host);
    const result = await probeService({ instance: strict(TLS, PLAIN), cached: PLAIN, controller: new AbortController(), routed });
    expect(result.id).toBe("lab");
    expect(probed).toEqual([TLS.host]);
  });

  it("keeps a plain loopback alias and drops a plain LAN one", async () => {
    const LOOPBACK = plain("loop", "localhost");
    const LAN_PLAIN: Alias = { ...plain("lan", "192.168.1.4"), reach: "lan" };
    const probed = answering(LOOPBACK.host, LAN_PLAIN.host);
    const result = await probeService({ instance: strict(LAN_PLAIN, LOOPBACK), controller: new AbortController(), routed });
    expect(result.id).toBe("loop");
    expect(probed).toEqual([LOOPBACK.host]);
  });

  it("keeps plain aliases lok calls loopback or internal", async () => {
    const LOOP_REACH: Alias = { ...plain("loop", "lab.local"), reach: "loopback" };
    const INTERNAL: Alias = { ...plain("internal", "mikro"), reach: "internal" };
    const DOCKER: Alias = { ...plain("docker", "mikro-docker"), kind: "docker" };
    const probed = answering();
    await expect(
      probeService({ instance: strict(PLAIN, LOOP_REACH, INTERNAL, DOCKER), controller: new AbortController(), routed }),
    ).rejects.toThrow("No working alias");
    expect(probed).toEqual(["lab.local", "mikro", "mikro-docker"]);
  });

  it("leaves a plain-HTTP hub alone", async () => {
    answering(PLAIN.host);
    const result = await probeService({ instance: instance(PLAIN), controller: new AbortController(), routed });
    expect(result.id).toBe("lab+http");
  });
});

describe("lok's ranking (priority)", () => {
  const ranked = (id: string, priority: number | null | undefined): Alias => ({ ...alias(id, `${id}.example.org`), priority });

  it("tries the alias lok ranks first, ahead of the cached one and of fakts' order", async () => {
    const LOW = ranked("low", 10);
    const HIGH = ranked("high", 0);
    const probed = answering(LOW.host, HIGH.host);
    const result = await probeService({ instance: instance(LOW, HIGH), cached: LOW, controller: new AbortController(), routed });
    expect(result.id).toBe("high");
    expect(probed[0]).toBe(HIGH.host);
  });

  it("ranks by priority without a cached alias, and puts aliases without one last", async () => {
    const NONE = ranked("none", undefined);
    const LOW = ranked("low", 5);
    const HIGH = ranked("high", 1);
    const probed = answering(NONE.host, LOW.host, HIGH.host);
    const result = await probeService({ instance: instance(NONE, LOW, HIGH), controller: new AbortController(), routed });
    expect(result.id).toBe("high");
    expect(probed).toEqual([HIGH.host, LOW.host, NONE.host]);
  });

  it("lets the cached alias break a tie among equal priorities, with its head start", async () => {
    const FIRST = ranked("first", 0);
    const SECOND = ranked("second", 0);
    const probed = answering(FIRST.host, SECOND.host);
    const result = await probeService({ instance: instance(FIRST, SECOND), cached: SECOND, controller: new AbortController(), routed });
    expect(result.id).toBe("second");
    expect(probed).toEqual([SECOND.host]);
  });

  it("keeps direct aliases ahead of mesh ones whatever their priority", async () => {
    const probed = answering(PUBLIC.host, MESH.host);
    const meshUp = vi.fn(async () => {});
    const result = await probeService({
      instance: instance({ ...MESH, priority: 0 }, { ...PUBLIC, priority: 5 }),
      controller: new AbortController(),
      routed,
      meshUp,
    });
    expect(result.id).toBe("pub");
    expect(probed).toEqual([PUBLIC.host]);
    expect(meshUp).not.toHaveBeenCalled();
  });
});

describe("the race", () => {
  const LAN = alias("lan", "192.168.1.4");
  /** Each host answers (or not) after its delay; a host not listed never answers. */
  const timed = (hosts: Record<string, { after: number; ok: boolean }>) => {
    const probed: string[] = [];
    vi.mocked(checkAliasHealth).mockImplementation(
      (a, _timeout, controller) =>
        new Promise<boolean>((resolve, reject) => {
          probed.push(a.host);
          controller.signal.addEventListener("abort", () => reject(new Error("aborted")));
          const answer = hosts[a.host];
          if (answer) setTimeout(() => resolve(answer.ok), answer.after);
        }),
    );
    return probed;
  };

  afterEach(() => vi.useRealTimers());

  it("gives a dead last alias a head start only, then tries the rest at once", async () => {
    vi.useFakeTimers();
    const probed = timed({ [PUBLIC.host]: { after: 50, ok: true } });
    const result = probeService({ instance: instance(LAN, PUBLIC), cached: LAN, controller: new AbortController(), routed, headStartMs: 1000 });
    await vi.advanceTimersByTimeAsync(999);
    expect(probed).toEqual([LAN.host]);
    await vi.advanceTimersByTimeAsync(1);
    expect(probed).toEqual([LAN.host, PUBLIC.host]);
    // The dead one is still in flight and preferred: it gets the tie window, no more.
    await vi.advanceTimersByTimeAsync(50 + 150);
    await expect(result).resolves.toMatchObject({ id: "pub" });
  });

  it("asks for the mesh while a slow direct alias is still in flight", async () => {
    vi.useFakeTimers();
    timed({ [MESH.host]: { after: 10, ok: true } });
    const meshUp = vi.fn(async () => {});
    const result = probeService({ instance: instance(LAN, MESH), controller: new AbortController(), routed, meshUp, meshAfterMs: 1500 });
    await vi.advanceTimersByTimeAsync(1499);
    expect(meshUp).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1 + 10 + 150);
    expect(meshUp).toHaveBeenCalledTimes(1);
    await expect(result).resolves.toMatchObject({ id: "mesh" });
  });

  it("asks for the mesh at once when the last alias was a mesh one, or there is no direct one", async () => {
    answering(MESH.host);
    const meshUp = vi.fn(async () => {});
    await probeService({ instance: instance(MESH, PUBLIC), cached: MESH, controller: new AbortController(), routed, meshUp });
    expect(meshUp).toHaveBeenCalledTimes(1);
    meshUp.mockClear();
    await probeService({ instance: instance(MESH), controller: new AbortController(), routed, meshUp });
    expect(meshUp).toHaveBeenCalledTimes(1);
  });

  it("prefers the alias fakts list first when both answer within the tie window", async () => {
    vi.useFakeTimers();
    const SECOND = alias("second", "second.example.org");
    timed({ [PUBLIC.host]: { after: 80, ok: true }, [SECOND.host]: { after: 10, ok: true } });
    const result = probeService({ instance: instance(PUBLIC, SECOND), controller: new AbortController(), routed });
    await vi.advanceTimersByTimeAsync(80);
    await expect(result).resolves.toMatchObject({ id: "pub" });
  });

  it("cancels the losers, and stops waiting on the mesh, once an alias has answered", async () => {
    vi.useFakeTimers();
    const aborted: string[] = [];
    vi.mocked(checkAliasHealth).mockImplementation(
      (a, _timeout, controller) =>
        new Promise<boolean>((resolve, reject) => {
          controller.signal.addEventListener("abort", () => {
            aborted.push(a.host);
            reject(new Error("aborted"));
          });
          if (a.host === PUBLIC.host) setTimeout(() => resolve(true), 2000);
        }),
    );
    const waits: boolean[] = [];
    const result = probeService({
      instance: instance(LAN, PUBLIC, MESH),
      controller: new AbortController(),
      routed,
      meshUp: () => new Promise(() => {}),
      onMeshWait: (waiting) => waits.push(waiting),
    });
    await vi.advanceTimersByTimeAsync(2000 + 150);
    await expect(result).resolves.toMatchObject({ id: "pub" });
    expect(aborted).toContain(LAN.host);
    expect(waits).toEqual([true, false]);
  });

  it("rejects with the caller's cancel, and probes nothing after it", async () => {
    vi.useFakeTimers();
    const probed = timed({});
    const controller = new AbortController();
    const result = probeService({ instance: instance(LAN, PUBLIC), cached: LAN, controller, routed });
    const outcome = expect(result).rejects.toThrow();
    controller.abort();
    await outcome;
    await vi.advanceTimersByTimeAsync(5000);
    expect(probed).toEqual([LAN.host]);
  });

  it("says no at once when the instance has no usable alias", async () => {
    await expect(probeService({ instance: instance(), controller: new AbortController(), routed })).rejects.toThrow("No working alias");
  });
});
