import { join } from "node:path";
import type { AppModule } from "../modules/AppModule";
import type { IpcTransport } from "../modules/IpcTransport";
import type { WindowManager } from "../modules/WindowManager";
import { ClaimSet, mergeConfigs } from "./claims";
import { MeshdProcess, type MeshChild } from "./MeshdProcess";
import {
  connecting,
  disconnected,
  isCurrent,
  leaseExpired,
  needsConnect,
  newRecord,
  onError,
  onStatus,
  presented,
  unreachable,
  usableKey,
  waitingForKey,
  withKey,
  type NodeRecord,
} from "./node";
import { buildPac, pacDataUrl, proxyPortForHost, routesFor, type PacRoute } from "./pac";
import {
  MESH_CLAIM_CHANNEL,
  MESH_EVENT_CHANNEL,
  MESH_FIREWALL_CHANNEL,
  MESH_JOIN_CHANNEL,
  MESH_LOCK_INIT_CHANNEL,
  MESH_LOCK_MAX_TRUSTED_KEYS,
  MESH_LOCK_SIGN_CHANNEL,
  isLockPublicKey,
  MESH_PING_CHANNEL,
  MESH_RESTART_CHANNEL,
  MESH_STATUS_CHANNEL,
  sanitizeAuthKey,
  sanitizeMeshConfig,
  type MeshClaimRequest,
  type MeshConfig,
  type MeshdEvent,
  type MeshEvent,
  type MeshFirewallState,
  type MeshJoinRequest,
  type MeshLockInitRequest,
  type MeshLockInitResult,
  type MeshLockSignRequest,
  type MeshLockSignResult,
  type MeshNodeStatus,
  type MeshPingRequest,
  type MeshPingResult,
  type MeshSnapshot,
  type MeshStatusPayload,
} from "./protocol";

export type { MeshChild } from "./MeshdProcess";

/**
 * The main-process half of the mesh: decides which nodes the sidecar runs,
 * and keeps the session's PAC script sending each mesh's hosts to its proxy.
 * It stores nothing on disk: a mesh belongs to a profile (organisation + hub)
 * and lives on that profile in the renderer's book.
 *
 * Three concerns, kept apart:
 *  - WHO WANTS a node: each window's claim (`claims.ts`, desired state only)
 *    and, while a key is joining, a lease main holds itself (`node.ts`);
 *  - the ONE-SHOT KEY (`join`): held here until the node is in with it, the
 *    control server refuses it, or it expires — never on a claim;
 *  - WHICH NODE IS CURRENT: every connect gets a generation that meshd stamps
 *    on every event, so a replaced or disconnected node's late events drop.
 *
 * Every change runs through one queue (`serialize`), so claims, joins,
 * crashes and restarts never interleave. Events from the sidecar update the
 * records at once and only queue a reconcile; nothing in the queue waits on a
 * node to come up.
 *
 * Everything Electron-specific is injected (`MeshServiceDeps`) so the class
 * runs under vitest against a fake child; `index.ts` wires the real spawn and
 * `session.defaultSession.setProxy`.
 *
 * Security: a configuration is validated here (the id names a directory); the
 * binary path is fixed (`meshdLocate.ts`), the argv a literal, and everything
 * reaches the sidecar as JSON over stdin. Keys are never logged or broadcast.
 */

export type MeshServiceDeps = {
  /** `undefined` when this build ships no sidecar for the platform. */
  binaryPath: string | undefined;
  spawn: (binaryPath: string) => MeshChild;
  /** `<userData>/mesh` — each mesh keeps its node state in `<root>/<id>`. */
  stateRoot: string;
  /** The node name this computer registers under. */
  hostname: string;
  /** `undefined` = DIRECT. Called only when the script changes, never concurrently. */
  applyProxy: (pacScript: string | undefined) => Promise<void>;
  /** Whether a path exists (the binary); defaults to a stat. */
  exists?: (path: string) => Promise<boolean>;
  /**
   * Whether a node's state file (`<root>/<id>/tailscaled.state`) holds a login
   * — tsnet writes `_current-profile` once one lands; a bare machine key is
   * not one. Defaults to reading the file.
   */
  hasLogin?: (stateFile: string) => Promise<boolean>;
  /** Windows' inbound firewall rules for the sidecar; `not-windows` elsewhere. */
  firewall?: () => Promise<MeshFirewallState>;
  /** Defaults to `Date.now`. */
  now?: () => number;
  log?: (message: string) => void;
};

const PING_TIMEOUT_MS = 30_000;
const LOCK_SIGN_TIMEOUT_MS = 30_000;
/** Init signs every machine on the mesh before the lock goes live. */
const LOCK_INIT_TIMEOUT_MS = 90_000;

type Waiter<T> = { meshId: string; settle: (result: T) => void };

export class MeshService implements AppModule {
  private readonly process: MeshdProcess;
  private readonly claims = new ClaimSet();
  private readonly records = new Map<string, NodeRecord>();
  private readonly leaseTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private nextGen = 0;
  private seq = 0;
  private queue: Promise<unknown> = Promise.resolve();
  /** Pings in flight, keyed `<meshId>::<target>`; settled by the final attempt. */
  private readonly pings = new Map<string, Waiter<MeshPingResult[]> & { results: MeshPingResult[] }>();
  /** Tailnet Lock signatures in flight, keyed `<meshId>::<nodeKey>`. */
  private readonly lockSigns = new Map<string, { promise: Promise<MeshLockSignResult>; waiter: Waiter<MeshLockSignResult> }>();
  /** At most one lock init per mesh; its answer carries secrets, so it has exactly one waiter. */
  private readonly lockInits = new Map<string, Waiter<MeshLockInitResult>>();
  private readonly watched = new Set<number>();
  private lastPac: string | undefined;
  private publishing: Promise<void> | undefined;
  private dirty = false;
  private quitting = false;

  constructor(
    private readonly transport: IpcTransport,
    private readonly windowManager: WindowManager,
    private readonly deps: MeshServiceDeps,
  ) {
    this.process = new MeshdProcess(
      { binaryPath: deps.binaryPath, spawn: deps.spawn, exists: deps.exists, log: (message) => this.log(message) },
      { onEvent: (event) => this.onSidecarEvent(event), onExit: (code) => this.onSidecarExit(code) },
    );
  }

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
    // Not tied to the sender: a join outlives the window that asked (the
    // lease, not the window, keeps the node up while it gets in).
    this.transport.handleChannel(MESH_JOIN_CHANNEL, (_event, request: MeshJoinRequest) => this.join(request));
    this.transport.handleChannel(MESH_PING_CHANNEL, (_event, request: MeshPingRequest) => this.ping(request));
    this.transport.handleChannel(MESH_LOCK_SIGN_CHANNEL, (_event, request: MeshLockSignRequest) =>
      this.lockSign(request),
    );
    this.transport.handleChannel(MESH_LOCK_INIT_CHANNEL, (_event, request: MeshLockInitRequest) =>
      this.lockInit(request),
    );
    this.transport.handleChannel(MESH_RESTART_CHANNEL, () => this.restart());
    this.transport.handleChannel(MESH_FIREWALL_CHANNEL, () => this.deps.firewall?.() ?? "not-windows");
  }

  onBeforeQuit() {
    this.quitting = true;
    for (const timer of this.leaseTimers.values()) clearTimeout(timer);
    void this.process.kill();
  }

  // ── what windows ask for ──

  /** Set (or with `mesh: null`, drop) one window's claim, and bring the nodes in line. */
  async claim(owner: number, request: MeshClaimRequest): Promise<MeshStatusPayload> {
    const mesh = request?.mesh == null ? undefined : sanitizeMeshConfig(request.mesh);
    if (request?.mesh != null && !mesh) throw new Error("Invalid mesh configuration");
    await this.serialize(async () => {
      this.claims.set(owner, mesh);
      await this.reconcile();
    });
    await this.publish();
    return this.statusPayload();
  }

  /** Hand over a one-shot key for a mesh's node and keep the node up while it joins. */
  async join(request: MeshJoinRequest): Promise<MeshStatusPayload> {
    const mesh = sanitizeMeshConfig(request?.mesh);
    const authKey = sanitizeAuthKey(request?.authKey);
    if (!mesh) throw new Error("Invalid mesh configuration");
    if (!authKey) throw new Error("Invalid mesh key");
    await this.serialize(async () => {
      const record = this.record(mesh.id);
      const next = withKey(record, authKey, mesh, this.now());
      this.records.set(mesh.id, next);
      if (next.lease) this.armLease(mesh.id, next.lease.until);
      await this.reconcile();
    });
    await this.publish();
    return this.statusPayload();
  }

  /**
   * "Check again": stop the sidecar and bring every wanted node back in a
   * fresh one — a fresh map from the coordination server, and the binary on
   * disk now (a sidecar outlives rebuilds otherwise). Nodes keep their state.
   * Refused while a node joins (restarting could replay a key the server
   * already took) or a lock setup runs (its answer would be lost).
   */
  async restart(): Promise<MeshStatusPayload> {
    if (this.lockInits.size > 0) throw new Error("Tailnet Lock is being set up; try again when it is done");
    if ([...this.records.values()].some((record) => record.lease)) {
      throw new Error("A mesh is joining; try again in a moment");
    }
    await this.serialize(async () => {
      await this.process.kill();
      for (const [id, record] of this.records) {
        if (record.connected) this.records.set(id, disconnected(record));
        this.settleWaiters(id, "The mesh client restarted");
      }
      await this.reconcile();
    });
    await this.publish();
    return this.statusPayload();
  }

  // ── reconcile ──

  /** Run `fn` after everything queued before it; a failure does not break the chain. */
  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch((error) => this.log(`mesh: ${errorMessage(error)}`));
    return run;
  }

  /** Every node someone wants: window claims and join leases, one per mesh. */
  private configs(): MeshConfig[] {
    const leased = [...this.records.values()].flatMap((record) => (record.lease ? [record.lease.config] : []));
    return mergeConfigs([...this.claims.values(), ...leased]);
  }

  /** Bring meshd in line with what is wanted. Idempotent; only ever runs in the queue. */
  private async reconcile(): Promise<void> {
    const now = this.now();
    const wanted = this.configs();
    const ids = new Set(wanted.map((config) => config.id));

    for (const [id, record] of this.records) {
      if (ids.has(id) || !record.connected) continue;
      this.process.send({ op: "disconnect", id, gen: record.gen });
      this.records.set(id, disconnected(record));
      this.settleWaiters(id, "The mesh was disconnected");
    }

    for (const config of wanted) {
      const record = this.record(config.id);
      if (!needsConnect(record, now)) continue;
      const key = usableKey(record, now);
      // No key and no login on disk: the node could only ask for an
      // interactive login nobody finishes, and the control server would hold
      // that request open. It waits for a key instead.
      if (!key && !(await this.loggedIn(config.id))) {
        this.records.set(config.id, waitingForKey(record));
        continue;
      }
      try {
        await this.process.ensure();
      } catch (error) {
        this.sidecarUnavailable(errorMessage(error));
        return;
      }
      const gen = ++this.nextGen;
      this.settleWaiters(config.id, "The mesh node was replaced");
      this.records.set(config.id, connecting(record, gen, key));
      this.process.send({
        op: "connect",
        id: config.id,
        gen,
        dir: join(this.deps.stateRoot, config.id),
        controlUrl: config.controlUrl,
        hostname: this.deps.hostname,
        ...(key ? { authKey: key.value } : {}),
      });
    }

    for (const id of [...this.records.keys()]) {
      const record = this.records.get(id)!;
      if (!ids.has(id) && !record.key && !record.lease) this.records.delete(id);
    }
    if (![...this.records.values()].some((record) => record.connected)) await this.process.kill();
  }

  /** From an event or a timer: queue a reconcile (after `first`), then publish either way. */
  private reconcileSoon(first?: () => void) {
    void this.serialize(async () => {
      first?.();
      await this.reconcile();
    }).then(
      () => this.publish(),
      () => this.publish(),
    );
  }

  private record(id: string): NodeRecord {
    return this.records.get(id) ?? newRecord(id);
  }

  /** The sidecar cannot be had (missing, outdated, would not start): no node can join. */
  private sidecarUnavailable(error: string) {
    for (const [id, record] of this.records) {
      this.records.set(id, unreachable(record, error));
      this.clearLease(id);
    }
    for (const config of this.configs()) {
      if (!this.records.has(config.id)) this.records.set(config.id, unreachable(newRecord(config.id), error));
    }
  }

  private armLease(id: string, until: number) {
    this.clearLease(id);
    this.leaseTimers.set(
      id,
      setTimeout(() => {
        this.leaseTimers.delete(id);
        this.reconcileSoon(() => {
          const record = this.records.get(id);
          if (record) this.records.set(id, leaseExpired(record, this.now()));
        });
      }, Math.max(0, until - this.now())),
    );
  }

  private clearLease(id: string) {
    const timer = this.leaseTimers.get(id);
    if (timer) clearTimeout(timer);
    this.leaseTimers.delete(id);
  }

  // ── sidecar events ──

  private onSidecarEvent(event: Exclude<MeshdEvent, { ev: "ready" }>) {
    if (event.ev === "log") {
      if (isCurrent(this.records.get(event.id), event.gen)) {
        this.broadcast({ type: "log", meshId: event.id, message: event.message });
      }
      return;
    }
    if (event.ev === "error") {
      if (!event.id) {
        this.log(event.message);
        return;
      }
      const record = this.records.get(event.id);
      if (!isCurrent(record, event.gen)) return;
      this.log(`[${event.id}] ${event.message}`);
      this.afterNodeChange(event.id, record, onError(record, event.message));
      return;
    }
    if (event.ev === "ping") {
      const { ev: _ev, id, gen, ...result } = event;
      if (!isCurrent(this.records.get(id), gen)) return;
      this.broadcast({ type: "ping", meshId: id, result });
      const key = `${id}::${result.target}`;
      const entry = this.pings.get(key);
      if (entry) {
        entry.results.push(result);
        if (result.final) entry.settle(entry.results);
      }
      return;
    }
    if (event.ev === "lock-sign") {
      if (!isCurrent(this.records.get(event.id), event.gen)) return;
      this.lockSigns.get(`${event.id}::${event.nodeKey}`)?.waiter.settle({ ok: event.ok, error: event.error || undefined });
      return;
    }
    if (event.ev === "lock-init") {
      if (!isCurrent(this.records.get(event.id), event.gen)) return;
      // Carries the disablement secret: to its one waiter, nowhere else.
      this.lockInits.get(event.id)?.settle({
        ok: event.ok,
        error: event.error || undefined,
        disablementSecrets: event.ok ? event.disablementSecrets : undefined,
      });
      return;
    }
    // status
    const { ev: _ev, gen, ...status } = event;
    const record = this.records.get(status.id);
    if (!isCurrent(record, gen)) return;
    this.afterNodeChange(status.id, record, onStatus(record, status));
  }

  /** Take the record's next state; a join that just ended may leave a node nobody claims. */
  private afterNodeChange(id: string, before: NodeRecord, after: NodeRecord) {
    this.records.set(id, after);
    if (before.lease && !after.lease) {
      this.clearLease(id);
      this.reconcileSoon();
      return;
    }
    void this.publish();
  }

  private onSidecarExit(code: number | null) {
    const error = `The mesh sidecar stopped unexpectedly (exit code ${code})`;
    for (const [id, record] of this.records) {
      if (record.connected) this.records.set(id, disconnected(record, this.quitting ? "stopped" : "error", this.quitting ? undefined : error));
      this.settleWaiters(id, "The mesh client stopped");
    }
    if (this.quitting) return;
    // A node still joining tries again with its key (attempts are capped);
    // the rest wait for the next claim, so a crashing sidecar is not looped.
    if ([...this.records.values()].some((record) => record.lease)) {
      this.reconcileSoon();
      return;
    }
    void this.publish();
  }

  // ── one-shot requests (Settings › Mesh) ──

  /**
   * Disco-ping one of a mesh's peers. The target must be an address the
   * mesh's own status lists — the renderer names a peer, it never gets to
   * hand the sidecar an arbitrary string. Resolves with every attempt, the
   * last one marked `final`; every attempt is also broadcast as it lands.
   */
  async ping(request: MeshPingRequest): Promise<MeshPingResult[]> {
    const record = this.records.get(request?.meshId);
    const target = typeof request?.target === "string" ? request.target.trim() : "";
    const known = (record?.status.peers ?? []).some((peer) => peer.ips.includes(target));
    if (!record?.connected || record.status.state !== "running" || !known) {
      throw new Error("Not a machine on a connected mesh");
    }
    if (!this.process.running) throw new Error("The mesh client is not running");
    const key = `${request.meshId}::${target}`;
    const pending = this.pings.get(key);
    if (pending) {
      return new Promise((resolve) => {
        const previous = pending.settle;
        pending.settle = (results) => {
          previous(results);
          resolve(results);
        };
      });
    }
    return new Promise<MeshPingResult[]>((resolve) => {
      const timer = setTimeout(() => entry.settle(timedOut(entry.results)), PING_TIMEOUT_MS);
      const timedOut = (results: MeshPingResult[]) => [
        ...results,
        { target, attempt: results.length + 1, final: true, ok: false, direct: false, error: "The mesh client did not answer" },
      ];
      const entry = {
        meshId: request.meshId,
        results: [] as MeshPingResult[],
        settle: (results: MeshPingResult[]) => {
          if (this.pings.get(key) !== entry) return;
          clearTimeout(timer);
          this.pings.delete(key);
          resolve(results);
        },
      };
      this.pings.set(key, entry);
      this.process.send({ op: "ping", id: request.meshId, gen: record.gen, target });
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
    const record = this.records.get(request?.meshId);
    const nodeKey = typeof request?.nodeKey === "string" ? request.nodeKey.trim() : "";
    const lock = record?.status.lock;
    if (!record?.connected || record.status.state !== "running" || !lock?.enabled) {
      throw new Error("Tailnet Lock is not on for a connected mesh");
    }
    if (!lock.trusted) throw new Error("This computer is not trusted to approve machines");
    if (!(lock.pending ?? []).some((peer) => peer.nodeKey === nodeKey)) {
      throw new Error("That machine is not waiting for approval");
    }
    if (!this.process.running) throw new Error("The mesh client is not running");
    const key = `${request.meshId}::${nodeKey}`;
    const inFlight = this.lockSigns.get(key);
    if (inFlight) return inFlight.promise;
    let waiter!: Waiter<MeshLockSignResult>;
    const promise = new Promise<MeshLockSignResult>((resolve) => {
      const timer = setTimeout(() => waiter.settle({ ok: false, error: "The mesh client did not answer" }), LOCK_SIGN_TIMEOUT_MS);
      waiter = {
        meshId: request.meshId,
        settle: (result) => {
          if (this.lockSigns.get(key)?.waiter !== waiter) return;
          clearTimeout(timer);
          this.lockSigns.delete(key);
          resolve(result);
        },
      };
    });
    this.lockSigns.set(key, { promise, waiter });
    this.process.send({ op: "lock-sign", id: request.meshId, gen: record.gen, nodeKey });
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
    const record = this.records.get(request?.meshId);
    const lock = record?.status.lock;
    if (!record?.connected || record.status.state !== "running" || !lock) {
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
    if (this.lockInits.has(request.meshId)) throw new Error("Tailnet Lock is already being set up");
    if (!this.process.running) throw new Error("The mesh client is not running");
    const meshId = request.meshId;
    return new Promise<MeshLockInitResult>((resolve) => {
      const timer = setTimeout(
        () => waiter.settle({ ok: false, error: "The mesh client did not answer. Check the mesh before trying again." }),
        LOCK_INIT_TIMEOUT_MS,
      );
      const waiter: Waiter<MeshLockInitResult> = {
        meshId,
        settle: (result) => {
          if (this.lockInits.get(meshId) !== waiter) return;
          clearTimeout(timer);
          this.lockInits.delete(meshId);
          resolve(result);
        },
      };
      this.lockInits.set(meshId, waiter);
      this.process.send({ op: "lock-init", id: meshId, gen: record.gen, trustedKeys });
    });
  }

  /** Whatever was asked of a node that is gone now is answered, not left to time out. */
  private settleWaiters(meshId: string, error: string) {
    for (const entry of [...this.pings.values()]) {
      if (entry.meshId !== meshId) continue;
      const target = entry.results[0]?.target ?? "";
      entry.settle([
        ...entry.results,
        { target, attempt: entry.results.length + 1, final: true, ok: false, direct: false, error },
      ]);
    }
    for (const { waiter } of [...this.lockSigns.values()]) {
      if (waiter.meshId === meshId) waiter.settle({ ok: false, error });
    }
    const init = this.lockInits.get(meshId);
    init?.settle({ ok: false, error: `${error}. Check the mesh before trying again.` });
  }

  /** For main's own Node clients: the proxy port a host tunnels through, if any. */
  proxyPortForHost(host: string): number | undefined {
    return proxyPortForHost(this.routes(), host);
  }

  // ── status, routing, broadcast ──

  private presentedStatuses(): Map<string, MeshNodeStatus> {
    return new Map([...this.records].map(([id, record]) => [id, presented(record)]));
  }

  private routes(): PacRoute[] {
    return routesFor(this.configs(), this.presentedStatuses());
  }

  /**
   * Recompute the PAC, apply it if it changed, and tell every window. Calls
   * coalesce: one runs at a time, and one more follows if anything changed
   * meanwhile — so `applyProxy` never runs concurrently and never goes stale.
   */
  private publish(): Promise<void> {
    this.dirty = true;
    if (!this.publishing) {
      this.publishing = (async () => {
        while (this.dirty) {
          this.dirty = false;
          const pac = buildPac(this.routes());
          if (pac !== this.lastPac) {
            this.lastPac = pac;
            try {
              await this.deps.applyProxy(pac === undefined ? undefined : pacDataUrl(pac));
            } catch (error) {
              this.log(`applyProxy: ${error}`);
            }
          }
          if (!this.quitting) this.broadcast({ type: "status", payload: this.statusPayload() });
        }
      })().finally(() => {
        this.publishing = undefined;
      });
    }
    return this.publishing;
  }

  private snapshots(): MeshSnapshot[] {
    return this.configs().map((config) => {
      const record = this.records.get(config.id);
      return {
        config,
        status: record ? presented(record) : { id: config.id, state: "stopped" },
        joining: !!record?.lease,
      };
    });
  }

  statusPayload(): MeshStatusPayload {
    return { seq: ++this.seq, sidecar: this.process.state, meshes: this.snapshots() };
  }

  private broadcast(event: MeshEvent) {
    for (const win of this.windowManager.getAllWindows()) {
      if (win.isDestroyed()) continue;
      this.transport.sendTo(win.webContents, MESH_EVENT_CHANNEL, event);
    }
  }

  private loggedIn(id: string): Promise<boolean> {
    return (this.deps.hasLogin ?? defaultHasLogin)(join(this.deps.stateRoot, id, "tailscaled.state"));
  }

  private now(): number {
    return (this.deps.now ?? Date.now)();
  }

  private log(message: string) {
    (this.deps.log ?? ((m: string) => console.log(`[mesh] ${m}`)))(message);
  }
}

const defaultHasLogin = async (stateFile: string): Promise<boolean> => {
  const { readFile } = await import("node:fs/promises");
  try {
    const state = JSON.parse(await readFile(stateFile, "utf8")) as Record<string, unknown>;
    return typeof state["_current-profile"] === "string" && state["_current-profile"].length > 0;
  } catch {
    return false;
  }
};

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));
