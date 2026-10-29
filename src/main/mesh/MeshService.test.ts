import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MeshService, type MeshChild, type MeshServiceDeps } from "./MeshService";
import { LEASE_MS } from "./node";
import { MESH_EVENT_CHANNEL, MESHD_PROTOCOL, type MeshConfig, type MeshdCommand, type MeshEvent } from "./protocol";

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

  connects(id = "lab") {
    return this.commands.filter((c): c is Extract<MeshdCommand, { op: "connect" }> => c.op === "connect" && c.id === id);
  }

  /** Speak as the node the LAST connect for `id` started (its generation). */
  node(id = "lab") {
    const gen = this.connects(id).at(-1)?.gen;
    return {
      gen,
      status: (state: string, extra: object = {}) => this.say({ ev: "status", id, gen, state, ...extra }),
      error: (message: string) => this.say({ ev: "error", id, gen, message }),
      say: (event: object) => this.say({ id, gen, ...event }),
    };
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

const harness = (overrides: Partial<MeshServiceDeps> & { protocol?: number } = {}) => {
  const { protocol = MESHD_PROTOCOL, ...depOverrides } = overrides;
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
      setTimeout(() => child.say({ ev: "ready", version: "test", protocol }), 0);
      return child;
    },
    stateRoot: "/state/mesh",
    hostname: "orkestrator-test",
    applyProxy: async (pac) => {
      applied.push(pac);
    },
    exists: async () => true,
    // A node that has logged in before, unless a test says otherwise.
    hasLogin: async () => true,
    log: () => {},
    ...depOverrides,
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects a malformed claim or join before anything happens", async () => {
    await expect(h.service.claim(1, { mesh: { ...LAB, controlUrl: "ftp://mesh.example.org" } })).rejects.toThrow();
    await expect(h.service.claim(1, { mesh: { ...LAB, id: "../../etc" } })).rejects.toThrow();
    await expect(h.service.join({ mesh: LAB, authKey: "" })).rejects.toThrow(/key/i);
    await expect(h.service.join({ mesh: LAB, authKey: "tskey with spaces" })).rejects.toThrow(/key/i);
    expect(h.children).toHaveLength(0);
  });

  it("a claim connects a node with a login on disk, once, under a generation", async () => {
    await h.service.claim(1, { mesh: { ...LAB, hosts: ["Data.Lab.Internal"] } });
    await flush();

    expect(h.children).toHaveLength(1);
    expect(h.children[0].commands).toEqual([
      {
        op: "connect",
        id: "lab",
        gen: expect.any(Number),
        dir: "/state/mesh/lab",
        controlUrl: "https://mesh.example.org",
        hostname: "orkestrator-test",
      },
    ]);
    const payload = h.service.statusPayload();
    expect(payload.sidecar).toEqual({ state: "ready", version: "test" });
    expect(payload.meshes[0]).toMatchObject({
      config: { id: "lab", hosts: ["data.lab.internal"] },
      status: { state: "starting" },
      joining: false,
    });

    // The same mesh claimed again (another window in the same profile) does not reconnect it.
    await h.service.claim(2, { mesh: LAB });
    expect(h.children[0].commands).toHaveLength(1);
  });

  it("numbers every payload so a reader can keep the newest", async () => {
    const first = h.service.statusPayload().seq;
    const second = (await h.service.claim(1, { mesh: LAB })).seq;
    expect(second).toBeGreaterThan(first);
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
    const labGen = h.children[0].node("lab").gen;
    await h.service.claim(3, { mesh: null });
    expect(h.children[0].commands.at(-1)).toEqual({ op: "disconnect", id: "lab", gen: labGen });
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

  describe("generations", () => {
    it("drops what a replaced node still had in flight", async () => {
      await h.service.claim(1, { mesh: LAB });
      await flush();
      const old = h.children[0].node();
      // A key replaces the node: a new generation.
      await h.service.join({ mesh: LAB, authKey: "tskey-fresh" });
      const current = h.children[0].node();
      expect(current.gen).not.toBe(old.gen);

      old.status("stopped");
      old.error("invalid auth key");
      await flush();
      expect(h.service.statusPayload().meshes[0].status).toEqual({ id: "lab", state: "starting" });

      current.status("running", { proxyPort: 5000 });
      await flush();
      expect(h.service.statusPayload().meshes[0].status).toMatchObject({ state: "running", proxyPort: 5000 });
    });

    it("drops a disconnected node's late status", async () => {
      await h.service.claim(1, { mesh: LAB });
      await h.service.claim(2, { mesh: OTHER });
      await flush();
      const lab = h.children[0].node("lab");
      await h.service.claim(1, { mesh: null });
      lab.status("running", { proxyPort: 5000 });
      await flush();
      expect(h.service.statusPayload().meshes.map((m) => m.config.id)).toEqual(["other"]);
      expect(h.service.proxyPortForHost("x.mesh.example.org")).toBeUndefined();
    });
  });

  describe("joining with a key", () => {
    it("keeps the node up on its own while it joins, then parks it if no window wants it", async () => {
      const fresh = harness({ hasLogin: async () => false });
      await fresh.service.setup();
      const { meshes } = await fresh.service.join({ mesh: LAB, authKey: "tskey-once" });
      await flush();
      expect(fresh.children[0].connects()).toEqual([expect.objectContaining({ authKey: "tskey-once" })]);
      expect(meshes[0]).toMatchObject({ joining: true, status: { state: "starting" } });

      // tsnet reads NeedsLogin while the keyed registration is in flight: not "not logged in".
      fresh.children[0].node().status("needs-login");
      await flush();
      expect(fresh.service.statusPayload().meshes[0].status.state).toBe("starting");

      fresh.children[0].node().status("running", { proxyPort: 5000 });
      await flush();
      await flush();
      // In with the key: the join is over, and nobody claims the mesh, so it parks.
      expect(fresh.children[0].commands.at(-2)).toMatchObject({ op: "disconnect", id: "lab" });
      expect(fresh.children[0].commands.at(-1)).toEqual({ op: "shutdown" });
      expect(fresh.service.statusPayload().meshes).toEqual([]);
    });

    it("a keyless claim landing mid-join never touches the keyed node (the sign-in race)", async () => {
      const fresh = harness({ hasLogin: async () => false });
      await fresh.service.setup();
      // Fired together, as the sign-in does: the join, then the window's own claim.
      await Promise.all([fresh.service.join({ mesh: LAB, authKey: "tskey-once" }), fresh.service.claim(1, { mesh: LAB })]);
      await flush();
      const child = fresh.children[0];
      expect(child.commands).toEqual([expect.objectContaining({ op: "connect", authKey: "tskey-once" })]);

      // The statuses of the joining node are kept, not dropped as stragglers.
      child.node().status("running", { proxyPort: 5000 });
      await flush();
      await flush();
      expect(fresh.service.statusPayload().meshes[0]).toMatchObject({ joining: false, status: { state: "running" } });
      // The window still claims it: in, and staying up.
      expect(child.commands.some((c) => c.op === "disconnect")).toBe(false);
    });

    it("a key the control server refuses is dropped, and the node reads not logged in with the reason", async () => {
      await h.service.claim(1, { mesh: LAB });
      await flush();
      h.children[0].node().status("needs-login");
      await flush();
      await h.service.join({ mesh: LAB, authKey: "tskey-refused" });
      const joining = h.children[0].node();
      joining.status("needs-login");
      joining.error("invalid auth key");
      await flush();
      await flush();
      expect(h.service.statusPayload().meshes[0]).toMatchObject({
        joining: false,
        status: { state: "needs-login", lastError: "invalid auth key" },
      });
      // A later status poll keeps the reason; nothing reconnects without a new key.
      joining.status("needs-login");
      await flush();
      expect(h.service.statusPayload().meshes[0].status.lastError).toBe("invalid auth key");
      expect(h.children[0].connects()).toHaveLength(2);
    });

    it("a newer key replaces one the node is still joining with; a node that is in ignores keys", async () => {
      await h.service.join({ mesh: LAB, authKey: "tskey-first" });
      await flush();
      await h.service.join({ mesh: LAB, authKey: "tskey-second" });
      expect(h.children[0].connects().map((c) => c.authKey)).toEqual(["tskey-first", "tskey-second"]);

      await h.service.claim(1, { mesh: LAB });
      h.children[0].node().status("running", { proxyPort: 5000 });
      await flush();
      await h.service.join({ mesh: LAB, authKey: "tskey-unused" });
      expect(h.children[0].connects()).toHaveLength(2);
      expect(h.service.statusPayload().meshes[0].joining).toBe(false);
    });

    it("the key survives a sidecar crash and is used again", async () => {
      await h.service.join({ mesh: LAB, authKey: "tskey-once" });
      await flush();
      h.children[0].emit("exit", 1);
      await flush();
      await flush();
      expect(h.children).toHaveLength(2);
      expect(h.children[1].connects()).toEqual([expect.objectContaining({ authKey: "tskey-once" })]);
    });

    it("the lease runs out on its own; the node then parks unless claimed", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
      const timed = harness();
      await timed.service.setup();
      const joined = timed.service.join({ mesh: LAB, authKey: "tskey-slow" });
      await vi.advanceTimersByTimeAsync(10);
      await joined;
      expect(timed.service.statusPayload().meshes[0].joining).toBe(true);
      await vi.advanceTimersByTimeAsync(LEASE_MS + 10);
      expect(timed.service.statusPayload().meshes).toEqual([]);
      expect(timed.children[0].commands.at(-1)).toEqual({ op: "shutdown" });
    });

    it("refuses a restart while a node joins", async () => {
      await h.service.join({ mesh: LAB, authKey: "tskey-once" });
      await expect(h.service.restart()).rejects.toThrow(/joining/i);
    });
  });

  it("starts no node without a key and without a login on disk", async () => {
    const fresh = harness({ hasLogin: async () => false });
    await fresh.service.setup();
    const { meshes } = await fresh.service.claim(1, { mesh: LAB });
    expect(fresh.children).toHaveLength(0);
    expect(meshes[0]).toMatchObject({ status: { state: "needs-login" }, joining: false });
  });

  it("reports a node that cannot authenticate and routes nothing for it", async () => {
    await h.service.claim(1, { mesh: LAB });
    await flush();
    h.children[0].node().status("needs-login", { proxyPort: 5000, magicDnsSuffix: "lab.mesh.example.org" });
    await flush();
    expect(h.service.statusPayload().meshes[0].status).toMatchObject({ state: "needs-login" });
    expect(h.applied.at(-1)).toBeUndefined();
    expect(h.service.proxyPortForHost("mikro.lab.mesh.example.org")).toBeUndefined();
  });

  it("applies a PAC when a mesh runs, and DIRECT again when its claim goes", async () => {
    await h.service.claim(1, { mesh: LAB });
    await flush();
    h.children[0].node().status("running", {
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
    expect(h.children[0].commands.at(-2)).toMatchObject({ op: "disconnect", id: "lab" });
    expect(h.children[0].commands.at(-1)).toEqual({ op: "shutdown" });
    expect(h.applied.at(-1)).toBeUndefined();
    expect(h.service.proxyPortForHost("mikro.lab.mesh.example.org")).toBeUndefined();
  });

  it("never applies two proxies at once, and the last one wins", async () => {
    let release!: () => void;
    let inFlight = 0;
    let most = 0;
    const slow = harness({
      applyProxy: async (pac) => {
        inFlight++;
        most = Math.max(most, inFlight);
        await new Promise<void>((resolve) => (release = resolve));
        inFlight--;
        slow.applied.push(pac);
      },
    });
    await slow.service.setup();
    const claimed = slow.service.claim(1, { mesh: LAB });
    await flush();
    await flush();
    slow.children[0].node().status("running", { proxyPort: 5000, magicDnsSuffix: "lab.mesh.example.org" });
    await flush();
    slow.children[0].node().status("running", { proxyPort: 5001, magicDnsSuffix: "lab.mesh.example.org" });
    await flush();
    for (let i = 0; i < 5; i++) {
      release?.();
      await flush();
    }
    await claimed;
    expect(most).toBe(1);
    expect(decodePac(slow.applied.at(-1)!)).toContain("127.0.0.1:5001");
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

  it("refuses a sidecar that speaks another protocol, and stops it", async () => {
    const outdated = harness({ protocol: 1 });
    await outdated.service.setup();
    const payload = await outdated.service.claim(1, { mesh: LAB });
    expect(payload.sidecar).toMatchObject({ state: "unavailable", reason: "outdated" });
    expect(payload.meshes[0].status.state).toBe("error");
    expect(outdated.children[0].commands).toEqual([{ op: "shutdown" }]);
  });

  it("kills a sidecar that never says it is ready, instead of keeping it", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const spawned: FakeChild[] = [];
    const silent = harness({
      spawn: () => {
        const child = new FakeChild();
        spawned.push(child);
        return child;
      },
    });
    await silent.service.setup();
    const claimed = silent.service.claim(1, { mesh: LAB });
    await vi.advanceTimersByTimeAsync(15_000);
    const payload = await claimed;
    expect(payload.sidecar).toMatchObject({ state: "unavailable", reason: "spawn-failed" });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(spawned[0].killed).toBe(true);
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
  });

  it("pings only a peer the mesh lists, and settles on the final attempt", async () => {
    const id = "lab";
    await h.service.claim(1, { mesh: LAB });
    await flush();
    const child = h.children[0];
    const node = child.node();
    node.status("running", {
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
    expect(child.commands.at(-1)).toEqual({ op: "ping", id, gen: node.gen, target: "100.64.0.5" });
    node.say({ ev: "ping", target: "100.64.0.5", attempt: 1, final: false, ok: true, latencyMs: 41, direct: false, derpRegion: "fra" });
    node.say({ ev: "ping", target: "100.64.0.5", attempt: 2, final: true, ok: true, latencyMs: 3.2, direct: true, endpoint: "10.0.0.7:41641" });
    const results = await done;
    expect(results.map((r) => [r.attempt, r.direct, r.final])).toEqual([
      [1, false, false],
      [2, true, true],
    ]);
    const pingEvents = h.sent.filter((e) => e.type === "ping");
    expect(pingEvents).toHaveLength(2);
    expect(pingEvents[1]).toMatchObject({ type: "ping", meshId: id, result: { direct: true, endpoint: "10.0.0.7:41641" } });
  });

  it("answers a ping in flight when the sidecar dies, instead of waiting it out", async () => {
    await h.service.claim(1, { mesh: LAB });
    await flush();
    h.children[0].node().status("running", { proxyPort: 5000, peers: [{ ips: ["100.64.0.5"], online: true }] });
    await flush();
    const done = h.service.ping({ meshId: "lab", target: "100.64.0.5" });
    await flush();
    h.children[0].emit("exit", 1);
    const results = await done;
    expect(results.at(-1)).toMatchObject({ final: true, ok: false });
  });

  describe("Tailnet Lock approval", () => {
    const id = "lab";
    const WAITING = "nodekey:aaaa";

    const running = async (lock: object | undefined, state = "running") => {
      await h.service.claim(1, { mesh: LAB });
      await flush();
      const child = h.children[0];
      child.node().status(state, { proxyPort: 5000, peers: [], lock });
      await flush();
      return child;
    };

    const signer = { enabled: true, signed: true, trusted: true, pending: [{ nodeKey: WAITING, name: "new-box", ips: [] }] };

    it("refuses before reaching the sidecar unless this computer may sign that machine", async () => {
      const child = await running({ ...signer, trusted: false });
      await expect(h.service.lockSign({ meshId: id, nodeKey: WAITING })).rejects.toThrow(/not trusted/i);

      child.node().status("running", { proxyPort: 5000, peers: [], lock: signer });
      await flush();
      await expect(h.service.lockSign({ meshId: id, nodeKey: "nodekey:bbbb" })).rejects.toThrow(/not waiting/i);
      await expect(h.service.lockSign({ meshId: "other", nodeKey: WAITING })).rejects.toThrow(/not on/i);

      child.node().status("running", { proxyPort: 5000, peers: [], lock: { ...signer, enabled: false } });
      await flush();
      await expect(h.service.lockSign({ meshId: id, nodeKey: WAITING })).rejects.toThrow(/not on/i);

      child.node().status("starting", { proxyPort: 5000, peers: [], lock: signer });
      await flush();
      await expect(h.service.lockSign({ meshId: id, nodeKey: WAITING })).rejects.toThrow(/not on/i);

      expect(child.commands.some((c) => c.op === "lock-sign")).toBe(false);
    });

    it("sends one sign for a listed machine and settles with the sidecar's answer", async () => {
      const child = await running(signer);
      const node = child.node();
      const first = h.service.lockSign({ meshId: id, nodeKey: ` ${WAITING} ` });
      const second = h.service.lockSign({ meshId: id, nodeKey: WAITING });
      await flush();
      expect(child.commands.filter((c) => c.op === "lock-sign")).toEqual([{ op: "lock-sign", id, gen: node.gen, nodeKey: WAITING }]);
      node.say({ ev: "lock-sign", nodeKey: WAITING, ok: false, error: "tailnet lock: this node is not trusted" });
      await expect(first).resolves.toEqual({ ok: false, error: "tailnet lock: this node is not trusted" });
      await expect(second).resolves.toEqual({ ok: false, error: "tailnet lock: this node is not trusted" });

      const again = h.service.lockSign({ meshId: id, nodeKey: WAITING });
      await flush();
      node.say({ ev: "lock-sign", nodeKey: WAITING, ok: true });
      await expect(again).resolves.toEqual({ ok: true, error: undefined });
    });

    it("gives up when the sidecar never answers", async () => {
      await running(signer);
      vi.useFakeTimers();
      const done = h.service.lockSign({ meshId: id, nodeKey: WAITING });
      vi.advanceTimersByTime(31_000);
      await expect(done).resolves.toEqual({ ok: false, error: "The mesh client did not answer" });
    });
  });

  describe("Tailnet Lock setup", () => {
    const id = "lab";
    const OURS = `tlpub:${"a".repeat(64)}`;
    const THEIRS = `tlpub:${"b".repeat(64)}`;
    const available = { allowed: true, enabled: false, signed: false, trusted: false, publicKey: OURS };

    const running = async (lock: object | undefined) => {
      await h.service.claim(1, { mesh: LAB });
      await flush();
      const child = h.children[0];
      child.node().status("running", { proxyPort: 5000, peers: [], lock });
      await flush();
      return child;
    };

    it("refuses before reaching the sidecar unless the lock can be set up here", async () => {
      const child = await running({ ...available, allowed: false });
      await expect(h.service.lockInit({ meshId: id, trustedKeys: [] })).rejects.toThrow(/not switched on/i);

      child.node().status("running", { proxyPort: 5000, peers: [], lock: { ...available, enabled: true } });
      await flush();
      await expect(h.service.lockInit({ meshId: id, trustedKeys: [] })).rejects.toThrow(/already set up/i);

      child.node().status("running", { proxyPort: 5000, peers: [], lock: available });
      await flush();
      await expect(h.service.lockInit({ meshId: id, trustedKeys: ["nodekey:abc"] })).rejects.toThrow(/not a tailnet lock key/i);
      await expect(h.service.lockInit({ meshId: id, trustedKeys: [`${THEIRS}; rm -rf`] })).rejects.toThrow(/not a tailnet lock key/i);
      await expect(h.service.lockInit({ meshId: "other", trustedKeys: [] })).rejects.toThrow(/not connected/i);

      expect(child.commands.some((c) => c.op === "lock-init")).toBe(false);
    });

    it("sends the other signers once, and hands the secret only to the caller", async () => {
      const child = await running(available);
      const node = child.node();
      const done = h.service.lockInit({ meshId: id, trustedKeys: [` ${THEIRS.toUpperCase().replace("TLPUB", "tlpub")} `, THEIRS, OURS] });
      await flush();
      await expect(h.service.lockInit({ meshId: id, trustedKeys: [] })).rejects.toThrow(/already being set up/i);
      expect(child.commands.filter((c) => c.op === "lock-init")).toEqual([{ op: "lock-init", id, gen: node.gen, trustedKeys: [THEIRS] }]);

      const before = h.sent.length;
      node.say({ ev: "lock-init", ok: true, disablementSecrets: ["disablement-secret:ABCD"] });
      await expect(done).resolves.toEqual({ ok: true, error: undefined, disablementSecrets: ["disablement-secret:ABCD"] });
      expect(JSON.stringify(h.sent.slice(before))).not.toContain("disablement-secret");
    });

    it("reports a failed init without secrets, and can be retried", async () => {
      const child = await running(available);
      const node = child.node();
      const failed = h.service.lockInit({ meshId: id, trustedKeys: [] });
      await flush();
      node.say({ ev: "lock-init", ok: false, error: "tka init-begin RPC: 403", disablementSecrets: ["disablement-secret:NOPE"] });
      await expect(failed).resolves.toEqual({ ok: false, error: "tka init-begin RPC: 403", disablementSecrets: undefined });

      const again = h.service.lockInit({ meshId: id, trustedKeys: [] });
      await flush();
      node.say({ ev: "lock-init", ok: true, disablementSecrets: ["disablement-secret:ABCD"] });
      await expect(again).resolves.toMatchObject({ ok: true });
    });
  });

  it("restarts into a fresh sidecar and reconnects every claimed mesh from its state", async () => {
    await h.service.claim(1, { mesh: LAB });
    await flush();
    const old = h.children[0];
    old.stdin.on("finish", () => setTimeout(() => old.emit("exit", 0), 0));

    const payload = await h.service.restart();
    expect(old.commands.at(-1)).toEqual({ op: "shutdown" });
    expect(h.children).toHaveLength(2);
    expect(h.children[1].commands).toEqual([
      { op: "connect", id: "lab", gen: expect.any(Number), dir: "/state/mesh/lab", controlUrl: LAB.controlUrl, hostname: "orkestrator-test" },
    ]);
    expect(payload.sidecar).toEqual({ state: "ready", version: "test" });
  });

  it("refuses a restart while Tailnet Lock is being set up", async () => {
    await h.service.claim(1, { mesh: LAB });
    await flush();
    h.children[0].node().status("running", {
      proxyPort: 5000,
      lock: { allowed: true, enabled: false, signed: false, trusted: false, publicKey: `tlpub:${"a".repeat(64)}` },
    });
    await flush();
    void h.service.lockInit({ meshId: "lab", trustedKeys: [] });
    await flush();
    await expect(h.service.restart()).rejects.toThrow(/being set up/i);
  });

  it("exposes the IPC surface as a closed set of channels", () => {
    expect([...h.handlers.keys()].sort()).toEqual(
      ["mesh:claim", "mesh:firewall", "mesh:join", "mesh:lock-init", "mesh:lock-sign", "mesh:ping", "mesh:restart", "mesh:status"].sort(),
    );
  });
});
