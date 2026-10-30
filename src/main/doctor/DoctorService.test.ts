import { describe, expect, it, vi } from "vitest";
import { DoctorService, type DoctorServiceDeps } from "./DoctorService";
import {
  DOCTOR_INTERFACES_CHANNEL,
  DOCTOR_MAX_TARGETS,
  DOCTOR_NETWORK_CHANNEL,
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

  const transport = new FakeTransport();
  const service = new DoctorService(transport as never, {
    probeNetwork,
    ...overrides,
  });
  service.setup();

  return { transport, probeNetwork };
};

const target = (host: string): ProbeTarget => ({
  host,
  port: 443,
  ssl: true,
  path: null,
  probePath: ".well-known/fakts",
});

describe("DoctorService wiring", () => {
  it("registers exactly the two channels", () => {
    const { transport } = setup();
    expect([...transport.handlers.keys()].sort()).toEqual(
      [DOCTOR_INTERFACES_CHANNEL, DOCTOR_NETWORK_CHANNEL].sort(),
    );
  });

  it("answers the interface probe from its dependency", async () => {
    const vpn = [{ name: "wg0", addresses: ["10.8.0.2"], kind: "wireguard" as const }];
    const { transport } = setup({ probeInterfaces: () => vpn });
    expect(await transport.invoke(DOCTOR_INTERFACES_CHANNEL)).toEqual(vpn);
  });

  it("probes every target it is given", async () => {
    const { transport, probeNetwork } = setup();
    const results = await transport.invoke(DOCTOR_NETWORK_CHANNEL, {
      targets: [target("a.example"), target("b.example")],
    });
    expect(results).toHaveLength(2);
    expect(probeNetwork).toHaveBeenCalledTimes(2);
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
      targets: [{ host: "  x.example ", port: 99999, ssl: "yes", path: 42, label: "l".repeat(500), serviceKey: 7 }],
    });
    const passed = probeNetwork.mock.calls[0][0];
    expect(passed.host).toBe("x.example");
    expect(passed.port).toBeNull();
    expect(passed.ssl).toBe(true);
    expect(passed.path).toBeNull();
    expect(passed.label).toHaveLength(120);
    expect(passed.serviceKey).toBeUndefined();
  });

  it("keeps a target's service key, so its result can be tied to the hub's report", async () => {
    const { transport, probeNetwork } = setup();
    await transport.invoke(DOCTOR_NETWORK_CHANNEL, {
      targets: [{ host: "x.example", ssl: true, serviceKey: "mikro" }],
    });
    expect(probeNetwork.mock.calls[0][0].serviceKey).toBe("mikro");
  });

  it("keeps a known hop role and drops anything else", async () => {
    const { transport, probeNetwork } = setup();
    await transport.invoke(DOCTOR_NETWORK_CHANNEL, {
      targets: [
        { host: "a.example", ssl: true, role: "coordination" },
        { host: "b.example", ssl: true, role: "rm -rf" },
      ],
    });
    expect(probeNetwork.mock.calls[0][0].role).toBe("coordination");
    expect(probeNetwork.mock.calls[1][0].role).toBeUndefined();
  });

  it("answers an empty or missing target list without probing", async () => {
    const { transport, probeNetwork } = setup();
    expect(await transport.invoke(DOCTOR_NETWORK_CHANNEL, { targets: [] })).toEqual([]);
    expect(await transport.invoke(DOCTOR_NETWORK_CHANNEL, {})).toEqual([]);
    expect(probeNetwork).not.toHaveBeenCalled();
  });
});

