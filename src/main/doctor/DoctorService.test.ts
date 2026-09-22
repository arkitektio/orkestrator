import { describe, expect, it, vi } from "vitest";
import { DoctorService, type DoctorServiceDeps } from "./DoctorService";
import {
  DOCTOR_MAX_TARGETS,
  DOCTOR_MESH_CHANNEL,
  DOCTOR_NETWORK_CHANNEL,
  DOCTOR_REMEDY_CHANNEL,
} from "./protocol";
import type { NetworkProbeResult, ProbeTarget } from "./protocol";

vi.mock("electron", () => ({ shell: { openPath: vi.fn(async () => "") } }));

/** A transport that just records handlers, so we can invoke them directly. */
class FakeTransport {
  handlers = new Map<string, (event: unknown, ...args: any[]) => unknown>();
  handleChannel(channel: string, listener: (event: unknown, ...args: any[]) => unknown) {
    this.handlers.set(channel, listener);
  }
  onChannel() {}
  sendTo() {}
  invoke<T = any>(channel: string, payload?: unknown): Promise<T> {
    const handler = this.handlers.get(channel);
    if (!handler) throw new Error(`no handler for ${channel}`);
    return Promise.resolve(handler({}, payload) as T);
  }
}

const setup = (overrides: Partial<DoctorServiceDeps> = {}) => {
  const probeNetwork = vi.fn(
    async (target: ProbeTarget, timeoutMs: number): Promise<NetworkProbeResult> => ({
      target,
      url: `https://${target.host}/`,
      dns: { ok: true, lookupAddresses: ["1.2.3.4"], resolveAddresses: ["1.2.3.4"] },
      tcp: { attempted: true, ok: true, ms: timeoutMs },
      tls: { attempted: false, ok: false },
      http: { attempted: true, ok: true, status: 200 },
      totalMs: 1,
    }),
  );
  const probeMesh = vi.fn(async () => ({
    vendor: "tailscale" as const,
    available: false as const,
    reason: "cli-not-found" as const,
  }));
  const runRemedy = vi.fn(async () => ({ ok: true, message: "done" }));

  const transport = new FakeTransport();
  const service = new DoctorService(transport as never, {
    probeNetwork,
    probeMesh,
    runRemedy,
    ...overrides,
  });
  service.setup();

  return { transport, probeNetwork, probeMesh, runRemedy };
};

const target = (host: string): ProbeTarget => ({
  host,
  port: 443,
  ssl: true,
  path: null,
  probePath: ".well-known/fakts",
});

describe("DoctorService wiring", () => {
  it("registers exactly the three channels", () => {
    const { transport } = setup();
    expect([...transport.handlers.keys()].sort()).toEqual(
      [DOCTOR_MESH_CHANNEL, DOCTOR_NETWORK_CHANNEL, DOCTOR_REMEDY_CHANNEL].sort(),
    );
  });

  it("probes every target it is given", async () => {
    const { transport, probeNetwork } = setup();
    const results = await transport.invoke(DOCTOR_NETWORK_CHANNEL, {
      targets: [target("a.example"), target("b.example")],
    });
    expect(results).toHaveLength(2);
    expect(probeNetwork).toHaveBeenCalledTimes(2);
  });

  it("asks the mesh provider on the mesh channel", async () => {
    const { transport, probeMesh } = setup();
    await transport.invoke(DOCTOR_MESH_CHANNEL);
    expect(probeMesh).toHaveBeenCalledOnce();
  });
});

describe("DoctorService bounds", () => {
  it("clamps the timeout to the protocol's range", async () => {
    const { transport, probeNetwork } = setup();

    await transport.invoke(DOCTOR_NETWORK_CHANNEL, { targets: [target("a")], timeoutMs: 999999 });
    expect(probeNetwork).toHaveBeenLastCalledWith(expect.anything(), 15000);

    await transport.invoke(DOCTOR_NETWORK_CHANNEL, { targets: [target("a")], timeoutMs: 1 });
    expect(probeNetwork).toHaveBeenLastCalledWith(expect.anything(), 500);

    await transport.invoke(DOCTOR_NETWORK_CHANNEL, { targets: [target("a")], timeoutMs: "nope" });
    expect(probeNetwork).toHaveBeenLastCalledWith(expect.anything(), 4000);
  });

  it("caps how many addresses one call may probe", async () => {
    const { transport, probeNetwork } = setup();
    const many = Array.from({ length: 40 }, (_, index) => target(`h${index}.example`));
    const results = await transport.invoke(DOCTOR_NETWORK_CHANNEL, { targets: many });
    expect(results).toHaveLength(DOCTOR_MAX_TARGETS);
    expect(probeNetwork).toHaveBeenCalledTimes(DOCTOR_MAX_TARGETS);
  });

  it("drops malformed targets instead of probing them", async () => {
    const { transport, probeNetwork } = setup();
    const results = await transport.invoke(DOCTOR_NETWORK_CHANNEL, {
      targets: [null, "nonsense", { ssl: true }, { host: "   " }, target("good.example")],
    });
    expect(results).toHaveLength(1);
    expect(probeNetwork.mock.calls[0][0].host).toBe("good.example");
  });

  it("coerces a hostile target into the protocol shape", async () => {
    const { transport, probeNetwork } = setup();
    await transport.invoke(DOCTOR_NETWORK_CHANNEL, {
      targets: [{ host: "  x.example ", port: 99999, ssl: "yes", path: 42, label: "l".repeat(500) }],
    });
    const passed = probeNetwork.mock.calls[0][0];
    expect(passed.host).toBe("x.example");
    expect(passed.port).toBeNull();
    expect(passed.ssl).toBe(true);
    expect(passed.path).toBeNull();
    expect(passed.label).toHaveLength(120);
  });

  it("answers an empty or missing target list without probing", async () => {
    const { transport, probeNetwork } = setup();
    expect(await transport.invoke(DOCTOR_NETWORK_CHANNEL, { targets: [] })).toEqual([]);
    expect(await transport.invoke(DOCTOR_NETWORK_CHANNEL, {})).toEqual([]);
    expect(probeNetwork).not.toHaveBeenCalled();
  });
});

describe("DoctorService remedy allowlist", () => {
  it("runs a remedy that is in the enum", async () => {
    const { transport, runRemedy } = setup();
    expect(await transport.invoke(DOCTOR_REMEDY_CHANNEL, { id: "tailscale.up" })).toEqual({
      ok: true,
      message: "done",
    });
    expect(runRemedy).toHaveBeenCalledWith("tailscale.up");
  });

  it.each([
    ["rm -rf /"],
    ["tailscale.down"],
    [""],
    [undefined],
    [42],
    [{ id: "tailscale.up" }],
  ])("refuses %p without invoking anything", async (id) => {
    const { transport, runRemedy } = setup();
    const result = await transport.invoke(DOCTOR_REMEDY_CHANNEL, { id });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("nothing was run");
    expect(runRemedy).not.toHaveBeenCalled();
  });

  it("refuses a missing payload entirely", async () => {
    const { transport, runRemedy } = setup();
    expect((await transport.invoke(DOCTOR_REMEDY_CHANNEL)).ok).toBe(false);
    expect(runRemedy).not.toHaveBeenCalled();
  });
});
