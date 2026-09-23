import { join } from "node:path";
import type { Readable, Writable } from "node:stream";
import type { AppModule } from "../modules/AppModule";
import type { IpcTransport } from "../modules/IpcTransport";
import type { WindowManager } from "../modules/WindowManager";
import { buildPac, pacDataUrl, proxyPortForHost, routesFor, type PacRoute } from "./pac";
import {
  MESH_CLAIM_CHANNEL,
  MESH_EVENT_CHANNEL,
  MESH_LOCK_INIT_CHANNEL,
  MESH_LOCK_MAX_TRUSTED_KEYS,
  MESH_LOCK_SIGN_CHANNEL,
  isLockPublicKey,
  MESH_PING_CHANNEL,
  MESH_RESTART_CHANNEL,
  MESH_STATUS_CHANNEL,
  parseMeshdLine,
  sanitizeMeshConfig,
  type MeshClaimRequest,
  type MeshConfig,
  type MeshdCommand,
  type MeshdEvent,
  type MeshEvent,
  type MeshLockInitRequest,
  type MeshLockInitResult,
  type MeshLockSignRequest,
  type MeshLockSignResult,
  type MeshNodeStatus,
  type MeshPingRequest,
  type MeshPingResult,
  type MeshSidecarState,
  type MeshSnapshot,
  type MeshStatusPayload,
} from "./protocol";

/**
 * The main-process half of the mesh: owns the sidecar process (`meshd`, one
 * process hosting every mesh) and the session's PAC script that sends each
 * mesh's hosts to its proxy. It stores nothing: a mesh belongs to a profile
 * (organisation + hub) and lives on that profile in the renderer's book.
 *
 * Everything Electron-specific is injected (`MeshServiceDeps`) so the class
 * runs under vitest against a fake child; `index.ts` wires the real
 * `child_process.spawn` and `session.defaultSession.setProxy`.
 *
 * Lifecycle: each window claims the mesh of the profile it is in
 * (`MeshClaimRequest`); the running set is the union of those claims, so a
 * mesh is up exactly while some window uses its profile, and a profile whose
 * mesh is switched off claims nothing. A window's claim goes with it when it
 * closes; the sidecar exits once nothing is claimed. It is killed on quit, and a crash marks the meshes stopped rather
 * than pretending; the next connect starts it again. There is no sign-in
 * flow here or in the sidecar: a node that cannot authenticate reports
 * `needs-login`, and the way back is signing in to the deployment again.
 *
 * Security: the renderer can only submit a configuration that is validated
 * here (the id is a plain token, since it names a directory); the binary path is fixed (`meshdLocate.ts`), the
 * argv is a literal, and configuration reaches the sidecar as JSON over
 * stdin, never as an argument.
 */

export type MeshChild = {
  pid?: number;
  stdin: Writable;
  stdout: Readable;
  stderr?: Readable | null;
  on(event: "exit", listener: (code: number | null) => void): unknown;
  once(event: "exit", listener: (code: number | null) => void): unknown;
  kill(): unknown;
};

export type MeshServiceDeps = {
  /** `undefined` when this build ships no sidecar for the platform. */
  binaryPath: string | undefined;
  spawn: (binaryPath: string) => MeshChild;
  /** `<userData>/mesh` — each mesh keeps its node state in `<root>/<id>`. */
  stateRoot: string;
  /** The node name this computer registers under. */
  hostname: string;
  /** `undefined` = DIRECT. Called only when the script changes. */
  applyProxy: (pacScript: string | undefined) => Promise<void>;
  /** Whether a path exists (the binary, a node's state file); defaults to a stat. */
  exists?: (path: string) => Promise<boolean>;
  log?: (message: string) => void;
};

const READY_TIMEOUT_MS = 15_000;
const KILL_GRACE_MS = 3_000;
const PING_TIMEOUT_MS = 30_000;
const LOCK_SIGN_TIMEOUT_MS = 30_000;
/** Init signs every machine on the mesh before the lock goes live. */
const LOCK_INIT_TIMEOUT_MS = 90_000;

export class MeshService implements AppModule {
  private child: MeshChild | undefined;
  private sidecar: MeshSidecarState = { state: "idle" };
  private readonly statuses = new Map<string, MeshNodeStatus>();
  /** Each window's claim, by webContents id. */
  private readonly claims = new Map<number, MeshConfig>();
  /** Meshes we asked the sidecar to bring up; re-sent after a crash restart. */
  private readonly wanted = new Set<string>();
  /** Which meshes have a logged-in node on disk; refreshed on every publish. */
  private readonly nodeState = new Map<string, boolean>();
  /** Pings in flight, keyed `<meshId>::<target>`; settled by the final attempt. */
  private readonly pings = new Map<string, { resolve: (results: MeshPingResult[]) => void; results: MeshPingResult[] }>();
  /** Tailnet Lock signatures in flight, keyed `<meshId>::<nodeKey>`. */
  private readonly lockSigns = new Map<string, Promise<MeshLockSignResult>>();
  private readonly lockSignWaiters = new Map<string, (result: MeshLockSignResult) => void>();
  /** At most one lock init per mesh; its answer carries secrets, so it has exactly one waiter. */
  private readonly lockInitWaiters = new Map<string, (result: MeshLockInitResult) => void>();
  private starting: Promise<void> | undefined;
  private lastPac: string | undefined;
  private quitting = false;

  constructor(
    private readonly transport: IpcTransport,
    private readonly windowManager: WindowManager,
    private readonly deps: MeshServiceDeps,
  ) {}

  async setup() {
    this.transport.handleChannel(MESH_STATUS_CHANNEL, () => this.statusPayload());
    this.transport.handleChannel(MESH_CLAIM_CHANNEL, (event, request: MeshClaimRequest) => {
      const sender = event?.sender;
      if (sender && !this.watched.has(sender.id)) {
        this.watched.add(sender.id);
        sender.once("destroyed", () => {
          this.watched.delete(sender.id);
          void this.claim(sender.id, { mesh: null });
        });
      }
      return this.claim(sender?.id ?? 0, request);
    });
    this.transport.handleChannel(MESH_PING_CHANNEL, (_event, request: MeshPingRequest) => this.ping(request));
    this.transport.handleChannel(MESH_LOCK_SIGN_CHANNEL, (_event, request: MeshLockSignRequest) =>
      this.lockSign(request),
    );
    this.transport.handleChannel(MESH_LOCK_INIT_CHANNEL, (_event, request: MeshLockInitRequest) =>
      this.lockInit(request),
    );
    this.transport.handleChannel(MESH_RESTART_CHANNEL, () => this.restart());
  }

  private readonly watched = new Set<number>();

  onBeforeQuit() {
    this.quitting = true;
    this.killChild();
  }

  // ── claims ──

  /**
   * Set (or with `mesh: null`, drop) one window's claim and bring the running
   * set in line with the union of claims. `authKey` is used for this connect
   * only and forgotten; it only matters when the mesh is not already up.
   */
  async claim(owner: number, request: MeshClaimRequest): Promise<MeshStatusPayload> {
    const mesh = request?.mesh == null ? undefined : sanitizeMeshConfig(request.mesh);
    if (request?.mesh != null && !mesh) throw new Error("Invalid mesh configuration");
    if (mesh) this.claims.set(owner, mesh);
    else this.claims.delete(owner);

    const desired = this.configs();
    for (const id of [...this.wanted]) {
      if (!desired.some((config) => config.id === id)) await this.disconnect(id, false);
    }
    for (const config of desired) {
      if (config.id !== mesh?.id) {
        if (!this.wanted.has(config.id)) await this.connect(config, undefined, false);
        continue;
      }
      const state = this.statuses.get(config.id)?.state;
      const up = state === "running" || state === "starting" || state === "needs-machine-auth";
      // A re-claim retries a node that is down (after a crash, say); a fresh
      // key also revives one that lost its membership. A node that is up
      // keeps its session, and any key is ignored.
      const retry = !up && (!!request.authKey || state !== "needs-login");
      if (!this.wanted.has(config.id) || retry) {
        await this.connect(config, request.authKey, false);
      }
    }
    for (const id of [...this.statuses.keys()]) {
      if (!desired.some((config) => config.id === id)) this.statuses.delete(id);
    }
    if (this.wanted.size === 0) this.killChild();
    await this.publish();
    return this.statusPayload();
  }

  /** The union of claims, one config per mesh id; pinned hosts are merged. */
  private configs(): MeshConfig[] {
    const byId = new Map<string, MeshConfig>();
    for (const config of this.claims.values()) {
      const seen = byId.get(config.id);
      byId.set(config.id, seen ? { ...seen, hosts: [...new Set([...seen.hosts, ...config.hosts])] } : config);
    }
    return [...byId.values()];
  }

  // ── nodes ──

  private async connect(mesh: MeshConfig, authKey: string | undefined, publish = true): Promise<void> {
    const id = mesh.id;
    this.wanted.add(id);
    this.setStatus({ id, state: "starting" });
    try {
      await this.ensureSidecar();
    } catch (error) {
      this.setStatus({ id, state: "error", error: errorMessage(error) });
      if (publish) await this.publish();
      return;
    }
    this.send({
      op: "connect",
      id,
      dir: join(this.deps.stateRoot, id),
      controlUrl: mesh.controlUrl,
      hostname: this.deps.hostname,
      authKey: authKey || undefined,
    });
    if (publish) await this.publish();
  }

  private async disconnect(id: string, publish = true): Promise<void> {
    this.wanted.delete(id);
    if (this.child) this.send({ op: "disconnect", id });
    this.setStatus({ id, state: "stopped" });
    if (publish) await this.publish();
  }

  /**
   * Disco-ping one of a mesh's peers. The target must be an address the
   * mesh's own status lists — the renderer names a peer, it never gets to
   * hand the sidecar an arbitrary string. Resolves with every attempt, the
   * last one marked `final`; every attempt is also broadcast as it lands.
   */
  async ping(request: MeshPingRequest): Promise<MeshPingResult[]> {
    const status = this.statuses.get(request.meshId);
    const target = typeof request.target === "string" ? request.target.trim() : "";
    const known = (status?.peers ?? []).some((peer) => peer.ips.includes(target));
    if (!status || status.state !== "running" || !known) {
      throw new Error("Not a machine on a connected mesh");
    }
    if (!this.child) throw new Error("The mesh client is not running");
    const key = `${request.meshId}::${target}`;
    const pending = this.pings.get(key);
    if (pending) {
      return new Promise((resolve) => {
        const previous = pending.resolve;
        pending.resolve = (results) => {
          previous(results);
          resolve(results);
        };
      });
    }
    return new Promise<MeshPingResult[]>((resolve) => {
      const entry = { resolve, results: [] as MeshPingResult[] };
      this.pings.set(key, entry);
      const timer = setTimeout(() => {
        if (this.pings.get(key) !== entry) return;
        this.pings.delete(key);
        entry.resolve([
          ...entry.results,
          { target, attempt: entry.results.length + 1, final: true, ok: false, direct: false, error: "The mesh client did not answer" },
        ]);
      }, PING_TIMEOUT_MS);
      entry.resolve = (results) => {
        clearTimeout(timer);
        resolve(results);
      };
      this.send({ op: "ping", id: request.meshId, target });
    });
  }

  /**
   * Approve a machine Tailnet Lock keeps cut off, by signing its node key
   * with this computer's lock key. Only a machine the mesh's own status lists
   * as waiting, and only when this computer is a trusted signer — the
   * renderer names a listed machine, it never hands over a key of its own.
   * The sidecar checks the same again against the node's live lock state.
   */
  async lockSign(request: MeshLockSignRequest): Promise<MeshLockSignResult> {
    const status = this.statuses.get(request?.meshId);
    const nodeKey = typeof request?.nodeKey === "string" ? request.nodeKey.trim() : "";
    const lock = status?.lock;
    if (!status || status.state !== "running" || !lock?.enabled) {
      throw new Error("Tailnet Lock is not on for a connected mesh");
    }
    if (!lock.trusted) throw new Error("This computer is not trusted to approve machines");
    if (!(lock.pending ?? []).some((peer) => peer.nodeKey === nodeKey)) {
      throw new Error("That machine is not waiting for approval");
    }
    if (!this.child) throw new Error("The mesh client is not running");
    const key = `${request.meshId}::${nodeKey}`;
    const inFlight = this.lockSigns.get(key);
    if (inFlight) return inFlight;
    const promise = new Promise<MeshLockSignResult>((resolve) => {
      const timer = setTimeout(() => settle({ ok: false, error: "The mesh client did not answer" }), LOCK_SIGN_TIMEOUT_MS);
      const settle = (result: MeshLockSignResult) => {
        if (this.lockSignWaiters.get(key) !== settle) return;
        clearTimeout(timer);
        this.lockSignWaiters.delete(key);
        this.lockSigns.delete(key);
        resolve(result);
      };
      this.lockSignWaiters.set(key, settle);
    });
    this.lockSigns.set(key, promise);
    this.send({ op: "lock-sign", id: request.meshId, nodeKey });
    return promise;
  }

  /**
   * Make this computer the mesh's Tailnet Lock key authority. Only when the
   * mesh is connected, the coordination server allows it and the lock is not
   * already set up; extra signers must be well-formed lock keys. The answer
   * carries the disablement secret and goes back to this caller only — it is
   * not broadcast, not logged and not kept.
   */
  async lockInit(request: MeshLockInitRequest): Promise<MeshLockInitResult> {
    const status = this.statuses.get(request?.meshId);
    const lock = status?.lock;
    if (!status || status.state !== "running" || !lock) {
      throw new Error("The mesh is not connected");
    }
    if (lock.enabled) throw new Error("Tailnet Lock is already set up for this mesh");
    if (!lock.allowed) throw new Error("Tailnet Lock is not switched on for this mesh on the coordination server");
    const raw = Array.isArray(request.trustedKeys) ? request.trustedKeys : [];
    const trustedKeys = [
      ...new Set(raw.map((key) => (typeof key === "string" ? key.trim().toLowerCase() : "")).filter(Boolean)),
    ].filter((key) => key !== lock.publicKey);
    if (!trustedKeys.every(isLockPublicKey)) throw new Error("Not a Tailnet Lock key (tlpub:…)");
    if (trustedKeys.length > MESH_LOCK_MAX_TRUSTED_KEYS) {
      throw new Error(`At most ${MESH_LOCK_MAX_TRUSTED_KEYS} other signers`);
    }
    if (this.lockInitWaiters.has(request.meshId)) throw new Error("Tailnet Lock is already being set up");
    if (!this.child) throw new Error("The mesh client is not running");
    const meshId = request.meshId;
    return new Promise<MeshLockInitResult>((resolve) => {
      const timer = setTimeout(
        () => settle({ ok: false, error: "The mesh client did not answer. Check the mesh before trying again." }),
        LOCK_INIT_TIMEOUT_MS,
      );
      const settle = (result: MeshLockInitResult) => {
        if (this.lockInitWaiters.get(meshId) !== settle) return;
        clearTimeout(timer);
        this.lockInitWaiters.delete(meshId);
        resolve(result);
      };
      this.lockInitWaiters.set(meshId, settle);
      this.send({ op: "lock-init", id: meshId, trustedKeys });
    });
  }

  /**
   * "Check again": stop the sidecar, wait for it to go, and bring every
   * claimed mesh back up in a fresh one. A fresh node gets a fresh map from
   * the coordination server (a capability granted there, say), and a fresh
   * process is the binary on disk now — a sidecar outlives rebuilds and app
   * updates otherwise. Nodes keep their state, so nothing re-authenticates.
   * Refused while a lock setup is running: its answer would be lost.
   */
  async restart(): Promise<MeshStatusPayload> {
    if (this.lockInitWaiters.size > 0) throw new Error("Tailnet Lock is being set up; try again when it is done");
    if (this.restarting) return this.restarting;
    this.restarting = (async () => {
      await this.killChild();
      for (const config of this.configs()) await this.connect(config, undefined, false);
      await this.publish();
      return this.statusPayload();
    })().finally(() => {
      this.restarting = undefined;
    });
    return this.restarting;
  }

  private restarting: Promise<MeshStatusPayload> | undefined;

  /** For main's own Node clients: the proxy port a host tunnels through, if any. */
  proxyPortForHost(host: string): number | undefined {
    return proxyPortForHost(this.routes(), host);
  }

  // ── sidecar process ──

  private async ensureSidecar(): Promise<void> {
    if (this.child && this.sidecar.state === "ready") return;
    if (this.starting) return this.starting;
    this.starting = this.spawnSidecar().finally(() => {
      this.starting = undefined;
    });
    return this.starting;
  }

  private async spawnSidecar(): Promise<void> {
    const binary = this.deps.binaryPath;
    const exists = this.deps.exists ?? defaultExists;
    if (!binary || !(await exists(binary))) {
      this.sidecar = { state: "unavailable", reason: "binary-missing", detail: binary };
      throw new Error("This build does not include the mesh sidecar");
    }
    this.sidecar = { state: "starting" };
    let child: MeshChild;
    try {
      child = this.deps.spawn(binary);
    } catch (error) {
      this.sidecar = { state: "unavailable", reason: "spawn-failed", detail: errorMessage(error) };
      throw error;
    }
    this.child = child;
    this.wireChild(child);
    await this.awaitReady(child);
  }

  private wireChild(child: MeshChild) {
    let buffer = "";
    child.stdout.setEncoding?.("utf8");
    child.stdout.on("data", (chunk: string | Buffer) => {
      buffer += chunk.toString();
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        const event = parseMeshdLine(line);
        if (event) this.onSidecarEvent(event);
        newline = buffer.indexOf("\n");
      }
    });
    child.stderr?.on("data", (chunk: string | Buffer) => {
      for (const line of chunk.toString().split("\n")) {
        if (line.trim()) this.log(line.trim());
      }
    });
    child.on("exit", (code) => {
      if (this.child !== child) return;
      this.child = undefined;
      const hadWork = this.wanted.size > 0;
      for (const id of this.wanted) {
        this.setStatus({
          id,
          state: this.quitting ? "stopped" : "error",
          error: this.quitting ? undefined : `The mesh sidecar stopped unexpectedly (exit code ${code})`,
        });
      }
      this.sidecar =
        this.quitting || !hadWork ? { state: "idle" } : { state: "crashed", detail: `exit code ${code}` };
      void this.publish();
    });
  }

  private awaitReady(child: MeshChild): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error("The mesh sidecar did not start in time")), READY_TIMEOUT_MS);
      const onExit = (code: number | null) => finish(new Error(`The mesh sidecar exited (code ${code})`));
      let settled = false;
      const finish = (error?: Error) => {
        // `once("exit")` stays registered past a successful handshake; a
        // later crash must not be re-reported as a failed spawn.
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.readyWaiters.delete(onReady);
        if (error) {
          this.sidecar = { state: "unavailable", reason: "spawn-failed", detail: error.message };
          reject(error);
        } else resolve();
      };
      const onReady = () => finish();
      this.readyWaiters.add(onReady);
      child.once("exit", onExit);
    });
  }

  private readonly readyWaiters = new Set<() => void>();

  private onSidecarEvent(event: MeshdEvent) {
    if (event.ev === "ready") {
      this.sidecar = { state: "ready", version: event.version };
      for (const waiter of [...this.readyWaiters]) waiter();
      void this.publish();
      return;
    }
    if (event.ev === "log") {
      this.broadcast({ type: "log", meshId: event.id, message: event.message });
      return;
    }
    if (event.ev === "error") {
      this.log(`[${event.id}] ${event.message}`);
      return;
    }
    if (event.ev === "ping") {
      const { ev: _ev, id, ...result } = event;
      this.broadcast({ type: "ping", meshId: id, result });
      const key = `${id}::${result.target}`;
      const entry = this.pings.get(key);
      if (entry) {
        entry.results.push(result);
        if (result.final) {
          this.pings.delete(key);
          entry.resolve(entry.results);
        }
      }
      return;
    }
    if (event.ev === "lock-sign") {
      this.lockSignWaiters.get(`${event.id}::${event.nodeKey}`)?.({ ok: event.ok, error: event.error || undefined });
      return;
    }
    if (event.ev === "lock-init") {
      // Carries the disablement secret: to its one waiter, nowhere else.
      this.lockInitWaiters.get(event.id)?.({
        ok: event.ok,
        error: event.error || undefined,
        disablementSecrets: event.ok ? event.disablementSecrets : undefined,
      });
      return;
    }
    // status
    const { ev: _ev, ...status } = event;
    if (!this.wanted.has(status.id)) return; // a straggler after disconnect
    this.setStatus(status);
    void this.publish();
  }

  private send(command: MeshdCommand) {
    if (!this.child) return;
    try {
      this.child.stdin.write(`${JSON.stringify(command)}\n`);
    } catch (error) {
      this.log(`send ${command.op}: ${error}`);
    }
  }

  /** Resolves once the sidecar has exited (or been killed after the grace period). */
  private killChild(): Promise<void> {
    const child = this.child;
    if (!child) return Promise.resolve();
    const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
    this.child = undefined;
    this.sidecar = { state: "idle" };
    try {
      child.stdin.write(`${JSON.stringify({ op: "shutdown" } satisfies MeshdCommand)}\n`);
      child.stdin.end();
    } catch {
      // Already gone.
    }
    // Closing stdin makes the sidecar tear its nodes down and exit; the kill
    // is for a hung one.
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        // Already gone.
      }
    }, KILL_GRACE_MS);
    child.once("exit", () => clearTimeout(timer));
    for (const id of this.wanted) this.setStatus({ id, state: "stopped" });
    if (!this.quitting) void this.publish();
    // Never wait forever on a process that will not report its exit.
    return Promise.race([exited, new Promise<void>((resolve) => setTimeout(resolve, KILL_GRACE_MS + 1_000))]);
  }

  // ── status, routing, broadcast ──

  private setStatus(status: MeshNodeStatus) {
    this.statuses.set(status.id, status);
  }

  private routes(): PacRoute[] {
    return routesFor(this.configs(), this.statuses);
  }

  private async refreshNodeState(): Promise<void> {
    const exists = this.deps.exists ?? defaultExists;
    await Promise.all(
      this.configs().map(async (mesh) => {
        this.nodeState.set(mesh.id, await exists(join(this.deps.stateRoot, mesh.id, "tailscaled.state")));
      }),
    );
  }

  /** Recompute the PAC, apply it if it changed, and tell every window. */
  private async publish(): Promise<void> {
    await this.refreshNodeState();
    const pac = buildPac(this.routes());
    if (pac !== this.lastPac) {
      this.lastPac = pac;
      try {
        await this.deps.applyProxy(pac === undefined ? undefined : pacDataUrl(pac));
      } catch (error) {
        this.log(`applyProxy: ${error}`);
      }
    }
    this.broadcast({ type: "status", payload: this.statusPayload() });
  }

  private snapshots(): MeshSnapshot[] {
    return this.configs().map((mesh) => ({
      config: { ...mesh, hasNodeState: this.nodeState.get(mesh.id) ?? false },
      status: this.statuses.get(mesh.id) ?? { id: mesh.id, state: "stopped" },
    }));
  }

  statusPayload(): MeshStatusPayload {
    return { sidecar: this.sidecar, meshes: this.snapshots() };
  }

  private broadcast(event: MeshEvent) {
    for (const win of this.windowManager.getAllWindows()) {
      if (win.isDestroyed()) continue;
      this.transport.sendTo(win.webContents, MESH_EVENT_CHANNEL, event);
    }
  }

  private log(message: string) {
    (this.deps.log ?? ((m: string) => console.log(`[mesh] ${m}`)))(message);
  }
}

const defaultExists = async (path: string): Promise<boolean> => {
  const { access } = await import("node:fs/promises");
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));
