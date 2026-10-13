import type { Operation } from "fast-json-patch";
import {
  applyStateOps,
  defaultCancel,
  defaultSchedule,
  type LiveStateSnapshot,
  type LiveStateValue,
} from "../hooks/liveStateStore";

/**
 * Agent state at a moment in the past, for everything that would otherwise
 * watch it live.
 *
 * One clock (`at`, in ms) for every agent that is being watched. Per agent the
 * source holds a buffer: the checkout at a base time and a window of the
 * patches that follow it. Any moment inside the buffer is answered here, with
 * no request — that is what makes playback and a dragged slider cheap; a
 * moment outside it is asked for again.
 *
 * Framework-free like `liveStateStore`: the checkout call, the clock and the
 * schedulers are handed in, so all of this is tested without React or Apollo.
 */

export type TravelPatch = {
  id: string;
  interface: string;
  op: string;
  path: string;
  value?: unknown;
  timestamp: string;
  globalFutureRevision: number;
};

/** What `checkoutAgent` answers. `values` is keyed by state interface. */
export type TravelCheckout = {
  values: Record<string, unknown> | null | undefined;
  globalRevision: number | null | undefined;
  forwardPatches: readonly TravelPatch[];
  backwardPatches: readonly TravelPatch[];
};

export type TravelRequest = {
  timestamp: number;
  forwardPatchCount: number;
  backwardPatchCount: number;
};

/**
 * `known: false` is "not answered yet": whoever shows the value keeps what it
 * shows. `known: true` with a `null` value is "nothing was recorded then".
 */
export type TravelSnapshot = LiveStateSnapshot & { known: boolean };

export type TravelClock = {
  at: number;
  playing: boolean;
  rate: number;
  /** `loading` while some watched agent has no answer for `at`. */
  phase: "ready" | "loading";
  /** The latest change at or before `at`, and the first one after it. */
  prevChangeAt: number | null;
  nextChangeAt: number | null;
  /** Agents with nothing to show at `at`: nothing recorded, or the checkout failed. */
  missing: readonly string[];
  error: string | null;
};

export type TravelSourceOptions = {
  checkout: (agentId: string, request: TravelRequest) => Promise<TravelCheckout>;
  now?: () => number;
  /** Frame scheduler for playback (defaults to `requestAnimationFrame`). */
  schedule?: (callback: () => void) => unknown;
  cancel?: (handle: unknown) => void;
  /** Timer for the debounced seek (defaults to `setTimeout`). */
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** How many patches are asked for after a checkout. */
  windowSize?: number;
  debounceMs?: number;
  /** Playback caught up with the present. The source has paused itself. */
  onReachedLive?: () => void;
};

export type TravelSource = {
  /** Watch one state of one agent; `listener` is called when its value changes. Returns the release function. */
  acquire(agentId: string, stateInterface: string, listener: () => void): () => void;
  /** Stable between changes, so it is safe as a `useSyncExternalStore` snapshot. */
  getSnapshot(agentId: string, stateInterface: string): TravelSnapshot;
  subscribe(listener: () => void): () => void;
  getClock(): TravelClock;
  /** Move the clock. Requests are debounced unless `immediate`. */
  seek(at: number, immediate?: boolean): void;
  /**
   * To just before the previous change (-1), or onto the next one (1). Asked
   * while the answer for the clock is still on its way (or before anything
   * watches), the step is taken as soon as that answer is there.
   */
  step(direction: -1 | 1): void;
  play(rate?: number): void;
  pause(): void;
  setRate(rate: number): void;
  /** Pause and drop what is pending. The source can be used again afterwards. */
  stop(): void;
};

export const EMPTY_TRAVEL_STATE: TravelSnapshot = Object.freeze({
  value: null,
  revision: null,
  known: false,
});

const NOTHING_RECORDED: TravelSnapshot = Object.freeze({
  value: null,
  revision: null,
  known: true,
});

/** Patches asked for before the checkout: only read to find the previous change. */
const BACKWARD_PATCHES = 8;
/** Playback asks for the next window when this much wall time is left in the current one. */
const LEAD_MS = 1500;
/** At least this long between two continuation requests for one agent. */
const REFETCH_MS = 500;
/** Playback this close to the present has caught up. */
const LIVE_MARGIN_MS = 2000;
/** The bar is told where a running clock is at most this often. */
const CLOCK_PUBLISH_MS = 100;

/**
 * A datetime without an offset is the server's clock, which runs on UTC:
 * `Date.parse` alone would read it as this machine's local time.
 */
export const parseTimestamp = (iso: string): number =>
  Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}Z`);

type BufferedPatch = { ms: number; revision: number; interface: string; op: Operation };

/** Oldest first. The server's order is not relied on. */
const sortPatches = (patches: readonly TravelPatch[]): BufferedPatch[] =>
  patches
    .map((patch, index) => ({
      index,
      ms: parseTimestamp(patch.timestamp),
      revision: patch.globalFutureRevision,
      interface: patch.interface,
      op: { op: patch.op, path: patch.path, value: patch.value } as Operation,
    }))
    .filter((patch) => Number.isFinite(patch.ms))
    .sort((a, b) => a.ms - b.ms || a.revision - b.revision || a.index - b.index);

/** How many of `patches` happened at or before `at`. */
const countUntil = (patches: readonly BufferedPatch[], at: number): number => {
  let low = 0;
  let high = patches.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (patches[middle].ms <= at) low = middle + 1;
    else high = middle;
  }
  return low;
};

type Values = Record<string, LiveStateValue | null>;

type Buffer = {
  /** The moment the checkout was asked for. */
  baseAt: number;
  /** The values then. Never mutated: a seek backwards starts over from it. */
  base: Values;
  revision: number | null;
  patches: BufferedPatch[];
  /** The buffer answers every moment in `[baseAt, horizon]`. */
  horizon: number;
  /** Whether as many patches came back as were asked for: there may be more. */
  full: boolean;
  /** The changes before `baseAt` the server told of, newest first. */
  backward: BufferedPatch[];
};

type InterfaceEntry = {
  refs: number;
  listeners: Set<() => void>;
  snapshot: TravelSnapshot;
};

type Agent = {
  id: string;
  interfaces: Map<string, InterfaceEntry>;
  buffer: Buffer | null;
  /** The buffer's values moved forward to the clock, and how many patches that took. */
  current: Values;
  applied: number;
  /** Bumped by every request and when the agent is let go: an answer to an older one is dropped. */
  seq: number;
  inflight: { seq: number; at: number } | null;
  requestedWall: number;
  /** Why the last checkout failed, and the moment it was asked for. */
  failed: string | null;
  failedAt: number | null;
};

const covers = (buffer: Buffer | null, at: number): buffer is Buffer =>
  buffer !== null && buffer.baseAt <= at && at <= buffer.horizon;

const sameClock = (a: TravelClock, b: TravelClock): boolean =>
  a.at === b.at &&
  a.playing === b.playing &&
  a.rate === b.rate &&
  a.phase === b.phase &&
  a.prevChangeAt === b.prevChangeAt &&
  a.nextChangeAt === b.nextChangeAt &&
  a.error === b.error &&
  a.missing.length === b.missing.length &&
  a.missing.every((id, index) => id === b.missing[index]);

export const createTravelSource = (options: TravelSourceOptions): TravelSource => {
  const now = options.now ?? Date.now;
  const schedule = options.schedule ?? defaultSchedule;
  const cancel = options.cancel ?? defaultCancel;
  const setTimer = options.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
  const clearTimer =
    options.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const windowSize = options.windowSize ?? 200;
  const debounceMs = options.debounceMs ?? 150;

  const agents = new Map<string, Agent>();
  const clockListeners = new Set<() => void>();

  let at = now();
  let playing = false;
  let rate = 1;
  /** Where the play clock was last pinned to the wall clock. */
  let anchor: { wall: number; at: number } | null = null;
  let frame: unknown | null = null;
  let timer: unknown | null = null;
  let publishedWall = 0;
  /** A step that waits for the answer it needs. Any other move of the clock drops it. */
  let pendingStep: -1 | 1 | null = null;
  let clock: TravelClock = {
    at,
    playing,
    rate,
    phase: "ready",
    prevChangeAt: null,
    nextChangeAt: null,
    missing: [],
    error: null,
  };

  const watched = (agent: Agent) => agent.interfaces.size > 0;

  const publish = (entry: InterfaceEntry, snapshot: TravelSnapshot) => {
    entry.snapshot = snapshot;
    entry.listeners.forEach((listener) => listener());
  };

  /** Bring the agent's values to the clock and tell whoever watches what changed. */
  const show = (agent: Agent) => {
    const buffer = agent.buffer;
    if (!covers(buffer, at)) return;
    const count = countUntil(buffer.patches, at);
    if (count < agent.applied) {
      agent.current = { ...buffer.base };
      agent.applied = 0;
    }
    if (count > agent.applied) {
      const opsByInterface = new Map<string, Operation[]>();
      for (let index = agent.applied; index < count; index += 1) {
        const patch = buffer.patches[index];
        const ops = opsByInterface.get(patch.interface);
        if (ops) ops.push(patch.op);
        else opsByInterface.set(patch.interface, [patch.op]);
      }
      const next = { ...agent.current };
      opsByInterface.forEach((ops, stateInterface) => {
        next[stateInterface] = applyStateOps(next[stateInterface] ?? null, ops);
      });
      agent.current = next;
      agent.applied = count;
    }
    const revision = count > 0 ? buffer.patches[count - 1].revision : buffer.revision;
    agent.interfaces.forEach((entry, stateInterface) => {
      const value = agent.current[stateInterface] ?? null;
      if (entry.snapshot.known && entry.snapshot.value === value) return;
      publish(entry, { value, revision, known: true });
    });
  };

  const computeClock = (): TravelClock => {
    let loading = false;
    let error: string | null = null;
    const missing: string[] = [];
    let prev: number | null = null;
    let next: number | null = null;
    // Where to look further when no change to a watched state is in reach.
    let prevHop: number | null = null;
    let nextHop: number | null = null;

    agents.forEach((agent) => {
      if (!watched(agent)) return;
      if (agent.failed !== null) {
        missing.push(agent.id);
        error = agent.failed;
        return;
      }
      const buffer = agent.buffer;
      if (!covers(buffer, at)) {
        loading = true;
        return;
      }
      if ([...agent.interfaces.values()].every((entry) => entry.snapshot.value === null)) {
        missing.push(agent.id);
      }

      const count = countUntil(buffer.patches, at);
      let before: number | null = null;
      for (let index = count - 1; index >= 0 && before === null; index -= 1) {
        if (agent.interfaces.has(buffer.patches[index].interface)) before = buffer.patches[index].ms;
      }
      if (before === null) {
        const known = buffer.backward.find((patch) => agent.interfaces.has(patch.interface));
        if (known) before = known.ms;
        else if (buffer.backward.length > 0) {
          const oldest = buffer.backward[buffer.backward.length - 1].ms;
          prevHop = prevHop === null ? oldest : Math.max(prevHop, oldest);
        }
      }
      if (before !== null) prev = prev === null ? before : Math.max(prev, before);

      let after: number | null = null;
      for (let index = count; index < buffer.patches.length && after === null; index += 1) {
        if (agent.interfaces.has(buffer.patches[index].interface)) after = buffer.patches[index].ms;
      }
      if (after !== null) next = next === null ? after : Math.min(next, after);
      else if (buffer.full) {
        const edge = buffer.horizon + 1;
        nextHop = nextHop === null ? edge : Math.min(nextHop, edge);
      }
    });

    return {
      at,
      playing,
      rate,
      phase: loading ? "loading" : "ready",
      prevChangeAt: prev ?? prevHop,
      nextChangeAt: next ?? nextHop,
      missing,
      error,
    };
  };

  const update = () => {
    const next = computeClock();
    if (!sameClock(clock, next)) {
      clock = next;
      publishedWall = now();
      clockListeners.forEach((listener) => listener());
    }
    if (pendingStep !== null && clock.phase === "ready" && [...agents.values()].some(watched)) {
      const direction = pendingStep;
      pendingStep = null;
      takeStep(direction);
    }
  };

  const toBuffer = (answer: TravelCheckout, baseAt: number, wall: number): Buffer => {
    const patches = sortPatches(answer.forwardPatches);
    const full = answer.forwardPatches.length >= windowSize;
    const last = patches[patches.length - 1];
    return {
      baseAt,
      base: { ...((answer.values ?? {}) as Values) },
      revision: answer.globalRevision ?? null,
      patches,
      // A full window may have been cut inside its last millisecond, so that
      // one is left to the next window. A short one holds everything that had
      // been recorded when it was asked for.
      horizon: Math.max(baseAt, full && last ? last.ms - 1 : wall),
      full,
      backward: sortPatches(answer.backwardPatches).reverse(),
    };
  };

  const request = (agent: Agent) => {
    const seq = (agent.seq += 1);
    const timestamp = at;
    const wall = now();
    agent.inflight = { seq, at: timestamp };
    agent.requestedWall = wall;
    const current = () => agents.get(agent.id) === agent && agent.seq === seq;

    options
      .checkout(agent.id, {
        timestamp,
        forwardPatchCount: windowSize,
        backwardPatchCount: BACKWARD_PATCHES,
      })
      .then(
        (answer) => {
          if (!current()) return;
          agent.inflight = null;
          agent.failed = null;
          agent.failedAt = null;
          agent.buffer = toBuffer(answer, timestamp, wall);
          agent.current = { ...agent.buffer.base };
          agent.applied = 0;
          show(agent);
          // The clock may have left this window while it was on its way.
          ensure(false);
          update();
        },
        (error: unknown) => {
          if (!current()) return;
          agent.inflight = null;
          agent.buffer = null;
          agent.failed = error instanceof Error ? error.message : String(error);
          agent.failedAt = timestamp;
          agent.interfaces.forEach((entry) => {
            if (entry.snapshot !== NOTHING_RECORDED) publish(entry, NOTHING_RECORDED);
          });
          update();
        },
      );
  };

  /** Ask for every watched agent that has no answer for the clock. */
  function ensure(immediate: boolean) {
    const wanting: Agent[] = [];
    agents.forEach((agent) => {
      if (!watched(agent) || covers(agent.buffer, at)) return;
      if (agent.inflight?.at === at) return;
      // A failed agent is asked again only when the clock has moved on.
      if (agent.failed !== null && agent.failedAt === at) return;
      wanting.push(agent);
    });
    if (wanting.length === 0) return;
    if (immediate) {
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
      }
      wanting.forEach(request);
      return;
    }
    if (timer !== null) clearTimer(timer);
    timer = setTimer(() => {
      timer = null;
      ensure(true);
      update();
    }, debounceMs);
  }

  const stopFrame = () => {
    if (frame !== null) {
      cancel(frame);
      frame = null;
    }
  };

  const tick = () => {
    frame = null;
    if (!playing || !anchor) return;
    const wall = now();
    const target = anchor.at + (wall - anchor.wall) * rate;

    // The clock never runs past what the slowest agent has an answer for.
    let limit = wall;
    agents.forEach((agent) => {
      if (!watched(agent) || agent.failed !== null) return;
      const buffer = agent.buffer;
      if (!covers(buffer, at)) limit = Math.min(limit, at);
      // A window that ends where it begins (more patches in one millisecond
      // than a window holds) is left by creeping on, or the clock would wait
      // for the same answer forever.
      else limit = Math.min(limit, buffer.horizon === buffer.baseAt ? at + 1 : buffer.horizon);
    });
    const next = Math.max(at, Math.floor(Math.min(target, limit)));
    // Held back: when the next window lands the clock goes on from here, without a jump.
    if (next < target) anchor = { wall, at: next };
    at = next;
    agents.forEach(show);

    if (at >= wall - LIVE_MARGIN_MS) {
      playing = false;
      anchor = null;
      update();
      options.onReachedLive?.();
      return;
    }

    agents.forEach((agent) => {
      if (!watched(agent) || agent.failed !== null || agent.inflight !== null) return;
      if (wall - agent.requestedWall < REFETCH_MS) return;
      const left = covers(agent.buffer, at) ? agent.buffer.horizon - at : 0;
      if (left < rate * LEAD_MS) request(agent);
    });

    if (wall - publishedWall >= CLOCK_PUBLISH_MS) update();
    frame = schedule(tick);
  };

  const startFrame = () => {
    if (frame === null) frame = schedule(tick);
  };

  const pause = () => {
    playing = false;
    anchor = null;
    stopFrame();
    update();
  };

  const seek = (target: number, immediate = false) => {
    if (!Number.isFinite(target)) return;
    at = Math.floor(Math.min(target, now()));
    if (playing) anchor = { wall: now(), at };
    agents.forEach(show);
    ensure(immediate);
    update();
  };

  function takeStep(direction: -1 | 1) {
    const target = direction < 0 ? clock.prevChangeAt : clock.nextChangeAt;
    if (target === null) return;
    seek(direction < 0 ? target - 1 : target, true);
  }

  return {
    acquire(agentId, stateInterface, listener) {
      let agent = agents.get(agentId);
      if (!agent) {
        agent = {
          id: agentId,
          interfaces: new Map(),
          buffer: null,
          current: {},
          applied: 0,
          seq: 0,
          inflight: null,
          requestedWall: Number.NEGATIVE_INFINITY,
          failed: null,
          failedAt: null,
        };
        agents.set(agentId, agent);
      }
      let entry = agent.interfaces.get(stateInterface);
      if (!entry) {
        entry = { refs: 0, listeners: new Set(), snapshot: EMPTY_TRAVEL_STATE };
        agent.interfaces.set(stateInterface, entry);
        if (agent.failed !== null) entry.snapshot = NOTHING_RECORDED;
        else show(agent);
      }
      entry.refs += 1;
      entry.listeners.add(listener);
      ensure(true);
      update();

      const held = agent;
      const heldEntry = entry;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        heldEntry.listeners.delete(listener);
        heldEntry.refs -= 1;
        if (heldEntry.refs > 0) return;
        if (held.interfaces.get(stateInterface) === heldEntry) held.interfaces.delete(stateInterface);
        if (!watched(held)) {
          held.seq += 1;
          if (agents.get(agentId) === held) agents.delete(agentId);
        }
        update();
      };
    },

    getSnapshot(agentId, stateInterface) {
      return agents.get(agentId)?.interfaces.get(stateInterface)?.snapshot ?? EMPTY_TRAVEL_STATE;
    },

    subscribe(listener) {
      clockListeners.add(listener);
      return () => {
        clockListeners.delete(listener);
      };
    },

    getClock: () => clock,

    seek(target, immediate) {
      pendingStep = null;
      seek(target, immediate);
    },

    step(direction) {
      if (clock.phase === "loading" || ![...agents.values()].some(watched)) {
        pendingStep = direction;
        return;
      }
      takeStep(direction);
    },

    play(nextRate) {
      pendingStep = null;
      if (nextRate !== undefined) rate = nextRate;
      playing = true;
      anchor = { wall: now(), at };
      startFrame();
      update();
    },

    pause() {
      pendingStep = null;
      pause();
    },

    setRate(nextRate) {
      rate = nextRate;
      if (playing) anchor = { wall: now(), at };
      update();
    },

    stop() {
      pendingStep = null;
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
      }
      pause();
    },
  };
};
