import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MeshService, type MeshChild, type MeshServiceDeps } from "./MeshService";
import { MESH_EVENT_CHANNEL, type MeshConfig, type MeshdCommand, type MeshEvent } from "./protocol";

/** A sidecar that records what it was told and lets the test speak back. */
class FakeChild extends EventEmitter implements MeshChild {
  pid = 4242;
  stdin = new PassThrough();
  stdout = new PassThrough();
  stderr = new PassThrough();
  commands: MeshdCommand[] = [];
  killed = false;

  constructor() {
    super();
    let buffer = "";
    this.stdin.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      let nl = buffer.indexOf("\n");
      while (nl !== -1) {
        this.commands.push(JSON.parse(buffer.slice(0, nl)));
        buffer = buffer.slice(nl + 1);
        nl = buffer.indexOf("\n");
      }
    });
  }

  say(event: object) {
    this.stdout.write(`${JSON.stringify(event)}\n`);
  }

  kill() {
    this.killed = true;
    this.emit("exit", 137);
  }
}

const LAB: MeshConfig = { id: "lab", label: "Lab", controlUrl: "https://mesh.example.org", hosts: [] };
const OTHER: MeshConfig = { id: "other", label: "Other", controlUrl: "https://mesh.other.org", hosts: [] };

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

type Harness = ReturnType<typeof harness>;

const harness = (overrides: Partial<MeshServiceDeps> = {}) => {
  const handlers = new Map<string, (event: unknown, ...args: any[]) => unknown>();
  const sent: MeshEvent[] = [];
  const transport = {
    handleChannel: (channel: string, listener: (event: unknown, ...args: any[]) => unknown) => {
      handlers.set(channel, listener);
    },
    sendTo: (_wc: unknown, channel: string, event: MeshEvent) => {
      if (channel === MESH_EVENT_CHANNEL) sent.push(event);
    },
  };
  const windowManager = {
    getAllWindows: () => [{ isDestroyed: () => false, webContents: {} }],
  };
  const children: FakeChild[] = [];
  const applied: (string | undefined)[] = [];
  const deps: MeshServiceDeps = {
    binaryPath: "/app/meshd",
    spawn: () => {
      const child = new FakeChild();
      children.push(child);
      // The real sidecar announces itself on the next tick.
      setTimeout(() => child.say({ ev: "ready", version: "test" }), 0);
      return child;
    },
    stateRoot: "/state/mesh",
    hostname: "orkestrator-test",
    applyProxy: async (pac) => {
      applied.push(pac);
    },
    exists: async (path) => !path.endsWith("tailscaled.state"),
    log: () => {},
    ...overrides,
  };
  const service = new MeshService(transport as any, windowManager as any, deps);
  return { service, handlers, sent, children, applied, deps };
};

const decodePac = (dataUrl: string): string =>
  Buffer.from(dataUrl.split(",")[1], "base64").toString("utf8");

describe("MeshService", () => {
  let h: Harness;

  beforeEach(async () => {
    h = harness();
    await h.service.setup();
  });

  it("rejects a malformed claim: bad control url, or an id that is not a plain token", async () => {
    await expect(h.service.claim(1, { mesh: { ...LAB, controlUrl: "ftp://mesh.example.org" } })).rejects.toThrow();
    await expect(h.service.claim(1, { mesh: { ...LAB, id: "../../etc" } })).rejects.toThrow();
    expect(h.children).toHaveLength(0);
  });

  it("a claim connects: spawns the sidecar once, sends a one-shot key over stdin", async () => {
    await h.service.claim(1, { mesh: { ...LAB, hosts: ["Data.Lab.Internal"] }, authKey: "tskey-secret" });
    await flush();

    expect(h.children).toHaveLength(1);
    expect(h.children[0].commands).toEqual([
      {
        op: "connect",
        id: "lab",
        dir: "/state/mesh/lab",
        controlUrl: "https://mesh.example.org",
        hostname: "orkestrator-test",
        authKey: "tskey-secret",
      },
    ]);
    const payload = h.service.statusPayload();
    expect(payload.sidecar).toEqual({ state: "ready", version: "test" });
    expect(payload.meshes[0].config).toMatchObject({ id: "lab", hosts: ["data.lab.internal"], hasNodeState: false });
    expect(payload.meshes[0].status.state).toBe("starting");

    // The same mesh claimed again (another window in the same profile) does not reconnect it.
    await h.service.claim(2, { mesh: LAB });
    expect(h.children[0].commands).toHaveLength(1);
  });

  it("runs the union of claims, and a mesh stays up while any window still claims it", async () => {
    await h.service.claim(1, { mesh: LAB });
    await h.service.claim(2, { mesh: OTHER });
    await h.service.claim(3, { mesh: LAB });
    await flush();
    expect(h.children[0].commands.map((c) => c.op === "connect" && c.id)).toEqual(["lab", "other"]);

    // Window 1 switches to a profile without a mesh: lab is still claimed by 3.
    await h.service.claim(1, { mesh: null });
    expect(h.children[0].commands.some((c) => c.op === "disconnect")).toBe(false);

    // Window 3 closes (or switches): lab goes down, other stays.
    await h.service.claim(3, { mesh: null });
    expect(h.children[0].commands.at(-1)).toEqual({ op: "disconnect", id: "lab" });
    expect(h.service.statusPayload().meshes.map((m) => m.config.id)).toEqual(["other"]);

    // Nothing claimed: the sidecar exits.
    await h.service.claim(2, { mesh: null });
    expect(h.children[0].commands.at(-1)).toEqual({ op: "shutdown" });
    expect(h.service.statusPayload().meshes).toEqual([]);
  });

  it("drops a window's claim when its webContents is destroyed", async () => {
    const sender = Object.assign(new EventEmitter(), { id: 7 });
    await h.handlers.get("mesh:claim")!({ sender }, { mesh: LAB });
    await flush();
    expect(h.service.statusPayload().meshes).toHaveLength(1);
    sender.emit("destroyed");
    await flush();
    expect(h.service.statusPayload().meshes).toEqual([]);
    expect(h.children[0].commands.at(-1)).toEqual({ op: "shutdown" });
  });

  it("uses a key to revive a node that lost its membership, but never on a running one", async () => {
    await h.service.claim(1, { mesh: LAB });
    await flush();
    h.children[0].say({ ev: "status", id: "lab", state: "needs-login" });
    await flush();
    // Re-claimed without a key: pointless to retry.
    await h.service.claim(1, { mesh: LAB });
    expect(h.children[0].commands).toHaveLength(1);

    await h.service.claim(1, { mesh: LAB, authKey: "tskey-fresh" });
    expect(h.children[0].commands.at(-1)).toMatchObject({ op: "connect", id: "lab", authKey: "tskey-fresh" });

    h.children[0].say({ ev: "status", id: "lab", state: "running", proxyPort: 5000 });
    await flush();
    await h.service.claim(1, { mesh: LAB, authKey: "tskey-unused" });
    expect(h.children[0].commands).toHaveLength(2);
  });

  it("reports a logged-in node on disk as hasNodeState", async () => {
    const withState = harness({ exists: async () => true });
    await withState.service.setup();
    const { meshes } = await withState.service.claim(1, { mesh: LAB });
    expect(meshes[0].config.hasNodeState).toBe(true);
  });

  it("reports a node that cannot authenticate and routes nothing for it", async () => {
    await h.service.claim(1, { mesh: LAB });
    await flush();
    h.children[0].say({ ev: "status", id: "lab", state: "needs-login", proxyPort: 5000, magicDnsSuffix: "lab.mesh.example.org" });
    await flush();
    expect(h.service.statusPayload().meshes[0].status).toMatchObject({ state: "needs-login" });
    expect(h.applied.at(-1)).toBeUndefined();
    expect(h.service.proxyPortForHost("mikro.lab.mesh.example.org")).toBeUndefined();
  });

  it("applies a PAC when a mesh runs, and DIRECT again when its claim goes", async () => {
    await h.service.claim(1, { mesh: LAB });
    await flush();
    h.children[0].say({
      ev: "status",
      id: "lab",
      state: "running",
      proxyPort: 5000,
      magicDnsSuffix: "lab.mesh.example.org",
      peers: [{ dnsName: "mikro.lab.mesh.example.org", hostName: "mikro", ips: ["100.64.0.5"], online: true }],
    });
    await flush();

    const last = h.applied.at(-1);
    expect(last).toMatch(/^data:application\/x-ns-proxy-autoconfig;base64,/);
    expect(decodePac(last!)).toContain('"lab.mesh.example.org","SOCKS5 127.0.0.1:5000"');
    const statusEvents = h.sent.filter((e) => e.type === "status");
    expect(statusEvents.at(-1)).toMatchObject({
      type: "status",
      payload: { meshes: [{ status: { state: "running", proxyPort: 5000 } }] },
    });
    expect(h.service.proxyPortForHost("mikro.lab.mesh.example.org")).toBe(5000);

    await h.service.claim(1, { mesh: null });
    expect(h.children[0].commands.at(-2)).toEqual({ op: "disconnect", id: "lab" });
    expect(h.children[0].commands.at(-1)).toEqual({ op: "shutdown" });
    expect(h.applied.at(-1)).toBeUndefined();
    expect(h.service.proxyPortForHost("mikro.lab.mesh.example.org")).toBeUndefined();
  });

  it("marks claimed meshes as errored when the sidecar dies, and a re-claim restarts it", async () => {
    await h.service.claim(1, { mesh: LAB });
    await flush();
    h.children[0].emit("exit", 1);
    await flush();
    const payload = h.service.statusPayload();
    expect(payload.sidecar).toEqual({ state: "crashed", detail: "exit code 1" });
    expect(payload.meshes[0].status).toMatchObject({ state: "error" });

    await h.service.claim(1, { mesh: LAB });
    await flush();
    expect(h.children).toHaveLength(2);
  });

  it("reports the sidecar as unavailable when the binary is missing", async () => {
    const missing = harness({ binaryPath: undefined });
    await missing.service.setup();
    const payload = await missing.service.claim(1, { mesh: LAB });
    expect(payload.sidecar).toMatchObject({ state: "unavailable", reason: "binary-missing" });
    expect(payload.meshes[0].status.state).toBe("error");
    expect(missing.children).toHaveLength(0);
  });

  it("starts nothing at setup: meshes live on profiles, and windows claim them", async () => {
    expect(h.children).toHaveLength(0);
    expect(h.service.statusPayload().meshes).toEqual([]);
  });

  it("shuts the sidecar down on quit", async () => {
    await h.service.claim(1, { mesh: LAB });
    await flush();
    vi.useFakeTimers();
    h.service.onBeforeQuit();
    expect(h.children[0].commands.at(-1)).toEqual({ op: "shutdown" });
    vi.advanceTimersByTime(5000);
    expect(h.children[0].killed).toBe(true);
    vi.useRealTimers();
  });

  it("pings only a peer the mesh lists, and settles on the final attempt", async () => {
    const id = "lab";
    await h.service.claim(1, { mesh: LAB });
    await flush();
    const child = h.children[0];
    child.say({
      ev: "status",
      id,
      state: "running",
      proxyPort: 5000,
      peers: [{ dnsName: "mikro.lab.mesh.example.org", hostName: "mikro", ips: ["100.64.0.5"], online: true }],
    });
    await flush();

    // Not one of the mesh's addresses: refused before anything reaches the sidecar.
    await expect(h.service.ping({ meshId: id, target: "100.64.0.99" })).rejects.toThrow(/not a machine/i);
    await expect(h.service.ping({ meshId: id, target: "evil; rm -rf" })).rejects.toThrow(/not a machine/i);
    expect(child.commands.some((c) => c.op === "ping")).toBe(false);

    const done = h.service.ping({ meshId: id, target: "100.64.0.5" });
    await flush();
    expect(child.commands.at(-1)).toEqual({ op: "ping", id, target: "100.64.0.5" });
    child.say({ ev: "ping", id, target: "100.64.0.5", attempt: 1, final: false, ok: true, latencyMs: 41, direct: false, derpRegion: "fra" });
    child.say({ ev: "ping", id, target: "100.64.0.5", attempt: 2, final: true, ok: true, latencyMs: 3.2, direct: true, endpoint: "10.0.0.7:41641" });
    const results = await done;
    expect(results.map((r) => [r.attempt, r.direct, r.final])).toEqual([
      [1, false, false],
      [2, true, true],
    ]);
    const pingEvents = h.sent.filter((e) => e.type === "ping");
    expect(pingEvents).toHaveLength(2);
    expect(pingEvents[1]).toMatchObject({ type: "ping", meshId: id, result: { direct: true, endpoint: "10.0.0.7:41641" } });
  });

  it("exposes the IPC surface as a closed set of channels", () => {
    expect([...h.handlers.keys()].sort()).toEqual(
["mesh:claim", "mesh:ping", "mesh:status"].sort(),
    );
  });
});
