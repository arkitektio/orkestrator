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
 * There is a second way to stand in the past: on one revision of one agent
 * (`seekRevision`). A revision numbers the patches of one session of one
 * agent, so several agents never share one: the agent that is stepped is
 * pinned to its revision, the clock stands on the moment that revision was
 * recorded, and every other agent follows the clock as before.
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
  /** Only asked for when the agent is stepped by revision. */
  sessionId?: string | null;
};

/** What `checkoutAgent` answers. `values` is keyed by state interface. */
export type TravelCheckout = {
  values: Record<string, unknown> | null | undefined;
  globalRevision: number | null | undefined;
  forwardPatches: readonly TravelPatch[];
  backwardPatches: readonly TravelPatch[];
};

export type TravelRequest = {
  /** Where the clock stood when this was asked. */
  timestamp: number;
  /**
   * Set for the agent that is stepped by revision: the checkout is taken at
   * `globalRevision` of that session instead of at `timestamp` (`null`: at
   * `timestamp`, to find out which revision that is), and every patch must
   * name its session.
   */
  revision?: { globalRevision: number | null; sessionId: string | null };
  forwardPatchCount: number;
  backwardPatchCount: number;
};

/**
 * `known: false` is "not answered yet": whoever shows the value keeps what it
 * shows. `known: true` with a `null` value is "nothing was recorded then".
 */
export type TravelSnapshot = LiveStateSnapshot & { known: boolean };

export type TravelChange = { interface: string; op: string; path: string };

/** Where the clock stands while one agent is stepped by revision. */
export type TravelRevision = {
  agentId: string;
  /** `null` until the first answer has told which session the clock is in. */
  sessionId: string | null;
  revision: number | null;
  /** The session's last revision, as far as it is known: where a slider over its revisions ends. */
  last: number | null;
  /** Whether the session has a revision before and after this one. */
  hasPrev: boolean;
  hasNext: boolean;
  /** What this revision changed. Empty at the start of a session. */
  changes: readonly TravelChange[];
};

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
  /** Set while an agent is stepped by revision; `at` is then the moment of that revision. */
  revision: TravelRevision | null;
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
  /** The last revision of one session of an agent, for the range of a slider. Without it only a session whose end was checked out has one. */
  sessionEnd?: (agentId: string, sessionId: string) => Promise<number | null>;
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
   * Stand on one revision of one agent, and step by revision from then on
   * (until the clock is moved by `seek` or `play`). Without a `position` it
   * is the revision the agent is at where the clock stands. A `position`
   * without a session stays in the session the agent is stepped in, or takes
   * the agent's latest. A revision the session does not have lands on the
   * latest one before it. Requests are debounced unless `immediate` (the
   * default): a dragged slider passes `false`.
   */
  seekRevision(
    agentId: string,
    position?: { revision: number; sessionId?: string | null },
    immediate?: boolean,
  ): void;
  /**
   * To just before the previous change (-1), or onto the next one (1). Asked
   * while the answer for the clock is still on its way (or before anything
   * watches), the step is taken as soon as that answer is there. While an
   * agent is stepped by revision it is one revision of that agent back or on.
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
/** Revisions checked out below the one asked for, so stepping back a little needs no request. */
const BACK_REVISIONS = 50;
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

type BufferedPatch = {
  ms: number;
  revision: number;
  session: string | null;
  interface: string;
  op: Operation;
};

/**
 * Oldest first, or lowest revision first for an agent that is stepped by
 * revision. The server's order is not relied on.
 */
const sortPatches = (patches: readonly TravelPatch[], byRevision = false): BufferedPatch[] =>
  patches
    .map((patch, index) => ({
      index,
      ms: parseTimestamp(patch.timestamp),
      revision: patch.globalFutureRevision,
      session: patch.sessionId ?? null,
      interface: patch.interface,
      op: { op: patch.op, path: patch.path, value: patch.value } as Operation,
    }))
    .filter((patch) => Number.isFinite(patch.ms))
    .sort((a, b) =>
      byRevision
        ? a.revision - b.revision || a.index - b.index
        : a.ms - b.ms || a.revision - b.revision || a.index - b.index,
    );

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

/** How many of `patches` (lowest revision first) belong to `revision` or one before it. */
const countUntilRevision = (patches: readonly BufferedPatch[], revision: number): number => {
  let low = 0;
  let high = patches.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (patches[middle].revision <= revision) low = middle + 1;
    else high = middle;
  }
  return low;
};

type Values = Record<string, LiveStateValue | null>;

/** The agent that is stepped by revision, and where it stands. */
type Pin = { agentId: string; sessionId: string | null; revision: number | null };

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
  /**
   * A checkout at a revision, for the agent that is stepped by revision:
   * `revision` is the one `base` holds, `patches` and `backward` are in
   * revision order, and it answers every revision from `revision` to its last
   * patch — `baseAt` and `horizon` say nothing.
   */
  byRevision: boolean;
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
  /** `key` is what was asked for (see `keyOf`). */
  inflight: { seq: number; key: string } | null;
  requestedWall: number;
  /** Why the last checkout failed, and what it was asked for. */
  failed: string | null;
  failedKey: string | null;
};

const sameRevision = (a: TravelRevision | null, b: TravelRevision | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.agentId === b.agentId &&
    a.sessionId === b.sessionId &&
    a.revision === b.revision &&
    a.last === b.last &&
    a.hasPrev === b.hasPrev &&
    a.hasNext === b.hasNext &&
    a.changes.length === b.changes.length &&
    a.changes.every(
      (change, index) =>
        change.interface === b.changes[index].interface &&
        change.op === b.changes[index].op &&
        change.path === b.changes[index].path,
    ));

const sameClock = (a: TravelClock, b: TravelClock): boolean =>
  a.at === b.at &&
  a.playing === b.playing &&
  a.rate === b.rate &&
  a.phase === b.phase &&
  a.prevChangeAt === b.prevChangeAt &&
  a.nextChangeAt === b.nextChangeAt &&
  a.error === b.error &&
  sameRevision(a.revision, b.revision) &&
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
  // Always inside the window that is asked for after it, or a step on at the
  // end of a window would ask for the same window again.
  const backRevisions = Math.min(BACK_REVISIONS, windowSize >> 1);

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
  /** Set while one agent is stepped by revision. Replaced, never mutated. */
  let pin: Pin | null = null;
  /** The last revision known of one session, and whether it has been asked for. */
  let end: { agentId: string; sessionId: string; last: number | null } | null = null;
  let clock: TravelClock = {
    at,
    playing,
    rate,
    phase: "ready",
    prevChangeAt: null,
    nextChangeAt: null,
    missing: [],
    error: null,
    revision: null,
  };

  const watched = (agent: Agent) => agent.interfaces.size > 0;
  /** The pinned agent is asked for even when no blok watches a state of it. */
  const wanted = (agent: Agent) => watched(agent) || pin?.agentId === agent.id;

  /** The agent's buffer, if it answers where the agent stands now. */
  const answering = (agent: Agent): Buffer | null => {
    const buffer = agent.buffer;
    if (buffer === null) return null;
    if (pin?.agentId === agent.id) {
      if (!buffer.byRevision || pin.revision === null || pin.revision < (buffer.revision ?? 0)) return null;
      const last = buffer.patches[buffer.patches.length - 1];
      return pin.revision <= (last ? last.revision : (buffer.revision ?? 0)) ? buffer : null;
    }
    return !buffer.byRevision && buffer.baseAt <= at && at <= buffer.horizon ? buffer : null;
  };

  /** How many of the buffer's patches lie at or before where the agent stands. */
  const reached = (buffer: Buffer): number =>
    buffer.byRevision ? countUntilRevision(buffer.patches, pin?.revision ?? 0) : countUntil(buffer.patches, at);

  /** What the agent would be asked for now: the same key is never asked twice in a row. */
  const keyOf = (agent: Agent): string =>
    pin?.agentId !== agent.id
      ? `at:${at}`
      : pin.revision === null
        ? `revision-at:${at}`
        : `revision:${pin.sessionId ?? ""}:${pin.revision}`;

  const newAgent = (id: string): Agent => {
    const agent: Agent = {
      id,
      interfaces: new Map(),
      buffer: null,
      current: {},
      applied: 0,
      seq: 0,
      inflight: null,
      requestedWall: Number.NEGATIVE_INFINITY,
      failed: null,
      failedKey: null,
    };
    agents.set(id, agent);
    return agent;
  };

  /** What the agent holds answers a question that is no longer asked. */
  const forget = (agent: Agent) => {
    agent.seq += 1;
    agent.inflight = null;
    agent.buffer = null;
    agent.failed = null;
    agent.failedKey = null;
  };

  /** Back to every agent following the clock. */
  const unpin = () => {
    if (pin === null) return;
    const agent = agents.get(pin.agentId);
    pin = null;
    if (!agent) return;
    forget(agent);
    if (!watched(agent)) agents.delete(agent.id);
  };

  const publish = (entry: InterfaceEntry, snapshot: TravelSnapshot) => {
    entry.snapshot = snapshot;
    entry.listeners.forEach((listener) => listener());
  };

  /** Bring the agent's values to the clock and tell whoever watches what changed. */
  const show = (agent: Agent) => {
    const buffer = answering(agent);
    if (buffer === null) return;
    const count = reached(buffer);
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

  /** The revisions next to the pinned one that the buffer knows of. `undefined`: past its end, and there may be more. */
  const neighbours = (buffer: Buffer, revision: number) => {
    const { patches, backward } = buffer;
    const base = buffer.revision ?? 0;
    const count = countUntilRevision(patches, revision);
    let index = count - 1;
    while (index >= 0 && patches[index].revision >= revision) index -= 1;
    const prev =
      index >= 0
        ? patches[index].revision
        : revision > base
          ? base
          : (backward.find((patch) => patch.revision < base)?.revision ?? null);
    const next = count < patches.length ? patches[count].revision : buffer.full ? undefined : null;
    return { prev, next };
  };

  /** While an agent is stepped by revision, the clock stands on the moment its revision was recorded. */
  const settle = () => {
    if (pin === null || pin.revision === null) return;
    const agent = agents.get(pin.agentId);
    const buffer = agent ? answering(agent) : null;
    if (!buffer) return;
    const count = reached(buffer);
    // The start of a session was recorded by no patch: it is just before the first one.
    const first = buffer.patches[0];
    const ms =
      count > 0 ? buffer.patches[count - 1].ms : (buffer.backward[0]?.ms ?? (first ? first.ms - 1 : undefined));
    if (ms !== undefined) at = Math.min(ms, now());
  };

  const lastOf = (standing: Pin): number | null =>
    end !== null && end.agentId === standing.agentId && end.sessionId === standing.sessionId ? end.last : null;

  /** The session grew, or its end was found: never back, a session only gains revisions. */
  const reaches = (agentId: string, sessionId: string, last: number) => {
    if (end === null || end.agentId !== agentId || end.sessionId !== sessionId) return;
    if (end.last === null || last > end.last) end = { ...end, last };
  };

  /** Ask once per session how far it reaches. */
  const measure = (agentId: string, sessionId: string | null) => {
    if (sessionId === null || (end !== null && end.agentId === agentId && end.sessionId === sessionId)) return;
    end = { agentId, sessionId, last: null };
    options.sessionEnd?.(agentId, sessionId).then(
      (last) => {
        if (last === null) return;
        reaches(agentId, sessionId, last);
        update();
      },
      // The slider stays away; the arrows and the number field do not need it.
      () => {},
    );
  };

  const computeClock = (): TravelClock => {
    let revision: TravelRevision | null =
      pin === null
        ? null
        : { agentId: pin.agentId, sessionId: pin.sessionId, revision: pin.revision, last: lastOf(pin), hasPrev: false, hasNext: false, changes: [] };
    let loading = false;
    let error: string | null = null;
    const missing: string[] = [];
    let prev: number | null = null;
    let next: number | null = null;
    // Where to look further when no change to a watched state is in reach.
    let prevHop: number | null = null;
    let nextHop: number | null = null;

    agents.forEach((agent) => {
      if (!wanted(agent)) return;
      if (agent.failed !== null) {
        missing.push(agent.id);
        error = agent.failed;
        return;
      }
      const buffer = answering(agent);
      if (buffer === null) {
        loading = true;
        return;
      }
      if (watched(agent) && [...agent.interfaces.values()].every((entry) => entry.snapshot.value === null)) {
        missing.push(agent.id);
      }

      if (pin !== null && pin.revision !== null && pin.agentId === agent.id) {
        const standing = pin.revision;
        const { prev: before, next: after } = neighbours(buffer, standing);
        const made = [...buffer.patches, ...buffer.backward].filter((patch) => patch.revision === standing);
        revision = {
          agentId: agent.id,
          sessionId: pin.sessionId,
          revision: standing,
          last: lastOf(pin),
          hasPrev: before !== null,
          hasNext: after !== null,
          changes: made.map((patch) => ({ interface: patch.interface, op: patch.op.op, path: patch.op.path })),
        };
        return;
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
      revision,
    };
  };

  const update = () => {
    const next = computeClock();
    if (!sameClock(clock, next)) {
      clock = next;
      publishedWall = now();
      clockListeners.forEach((listener) => listener());
    }
    if (pendingStep !== null && clock.phase === "ready" && [...agents.values()].some(wanted)) {
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
      byRevision: false,
    };
  };

  /** `asked` is the revision the checkout was taken at, `null` when it was taken at the clock. */
  const toRevisionBuffer = (answer: TravelCheckout, asked: number | null): Buffer => {
    const backward = sortPatches(answer.backwardPatches, true).reverse();
    return {
      baseAt: at,
      base: { ...((answer.values ?? {}) as Values) },
      // The server tells the changes up to and including the checkout: the
      // newest of them is the revision the values are at.
      revision: backward[0]?.revision ?? asked ?? answer.globalRevision ?? 0,
      patches: sortPatches(answer.forwardPatches, true),
      horizon: at,
      full: answer.forwardPatches.length >= windowSize,
      backward,
      byRevision: true,
    };
  };

  /** The pinned agent's answer says which revision and session the pin really stands on. */
  const land = (buffer: Buffer) => {
    if (pin === null) return;
    const base = buffer.revision ?? 0;
    const session = buffer.backward[0]?.session ?? buffer.patches[0]?.session ?? pin.sessionId;
    let revision = pin.revision ?? base;
    if (revision >= base) {
      // A revision the session does not have is the latest one before it.
      const count = countUntilRevision(buffer.patches, revision);
      revision = count > 0 ? buffer.patches[count - 1].revision : base;
    }
    pin = { agentId: pin.agentId, sessionId: session, revision };
    measure(pin.agentId, session);
    const newest = buffer.patches[buffer.patches.length - 1]?.revision ?? base;
    // A window that came back short ends where the session ends.
    if (session !== null && (!buffer.full || newest > (lastOf(pin) ?? newest))) reaches(pin.agentId, session, newest);
  };

  /** `exact`: check out the pinned revision itself, with nothing below it to step back into. */
  const request = (agent: Agent, exact = false) => {
    const seq = (agent.seq += 1);
    const timestamp = at;
    const wall = now();
    const key = keyOf(agent);
    const pinned = pin?.agentId === agent.id ? pin : null;
    const target = pinned?.revision ?? null;
    const asked = target === null ? null : exact ? target : Math.max(0, target - backRevisions);
    agent.inflight = { seq, key };
    agent.requestedWall = wall;
    // The pin is unpinned or moved to another agent only through `forget`, which moves `seq` on.
    const current = () => agents.get(agent.id) === agent && agent.seq === seq;

    options
      .checkout(agent.id, {
        timestamp,
        ...(pinned ? { revision: { globalRevision: asked, sessionId: pinned.sessionId } } : {}),
        forwardPatchCount: windowSize,
        backwardPatchCount: BACKWARD_PATCHES,
      })
      .then(
        (answer) => {
          if (!current()) return;
          agent.inflight = null;
          agent.failed = null;
          agent.failedKey = null;
          agent.buffer = pinned ? toRevisionBuffer(answer, asked) : toBuffer(answer, timestamp, wall);
          agent.current = { ...agent.buffer.base };
          agent.applied = 0;
          if (pinned) {
            // The clock goes to the moment of the revision, and every agent with it.
            land(agent.buffer);
            settle();
            agents.forEach(show);
          } else show(agent);
          // The clock may have left this window while it was on its way; a
          // revision that landed has just moved it, and nobody is dragging.
          ensure(pinned !== null);
          update();
        },
        (error: unknown) => {
          if (!current()) return;
          // The session may not reach as far down as was asked for: the revision itself still answers.
          if (asked !== null && target !== null && asked < target) {
            request(agent, true);
            return;
          }
          agent.inflight = null;
          agent.buffer = null;
          agent.failed = error instanceof Error ? error.message : String(error);
          agent.failedKey = key;
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
      if (!wanted(agent) || answering(agent) !== null) return;
      const key = keyOf(agent);
      if (agent.inflight?.key === key) return;
      // A failed agent is asked again only when the clock has moved on.
      if (agent.failed !== null && agent.failedKey === key) return;
      wanting.push(agent);
    });
    if (wanting.length === 0) return;
    if (immediate) {
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
      }
      wanting.forEach((agent) => request(agent));
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
      const buffer = answering(agent);
      if (buffer === null) limit = Math.min(limit, at);
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
      const buffer = answering(agent);
      const left = buffer ? buffer.horizon - at : 0;
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
    unpin();
    at = Math.floor(Math.min(target, now()));
    if (playing) anchor = { wall: now(), at };
    agents.forEach(show);
    ensure(immediate);
    update();
  };

  /** The pin moved: show it, take the clock and every other agent along, ask for what is missing. */
  const follow = (immediate = true) => {
    settle();
    agents.forEach(show);
    ensure(immediate);
    update();
  };

  const takeRevisionStep = (standing: Pin, direction: -1 | 1) => {
    const agent = agents.get(standing.agentId);
    const buffer = agent ? answering(agent) : null;
    if (!agent || !buffer || standing.revision === null) return;
    const { prev, next } = neighbours(buffer, standing.revision);
    const target = direction < 0 ? prev : next;
    if (target === null) return;
    if (target === undefined) {
      // The end of a full window: the step is taken once the window after it is there.
      pendingStep = direction;
      forget(agent);
    } else pin = { ...standing, revision: target };
    follow();
  };

  function takeStep(direction: -1 | 1) {
    if (pin !== null) {
      takeRevisionStep(pin, direction);
      return;
    }
    const target = direction < 0 ? clock.prevChangeAt : clock.nextChangeAt;
    if (target === null) return;
    seek(direction < 0 ? target - 1 : target, true);
  }

  return {
    acquire(agentId, stateInterface, listener) {
      const agent = agents.get(agentId) ?? newAgent(agentId);
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
        if (!wanted(held)) {
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

    seekRevision(agentId, position, immediate = true) {
      pendingStep = null;
      playing = false;
      anchor = null;
      stopFrame();
      const sessionId =
        position === undefined
          ? null
          : position.sessionId !== undefined
            ? position.sessionId
            : pin?.agentId === agentId
              ? pin.sessionId
              : null;
      const kept = pin !== null && pin.agentId === agentId && pin.sessionId === sessionId && position !== undefined;
      if (pin !== null && pin.agentId !== agentId) unpin();
      const agent = agents.get(agentId) ?? newAgent(agentId);
      // Within the session that is stepped, what is buffered may already answer.
      if (!kept) forget(agent);
      pin = { agentId, sessionId, revision: position?.revision ?? null };
      follow(immediate);
    },

    step(direction) {
      if (clock.phase === "loading" || ![...agents.values()].some(wanted)) {
        pendingStep = direction;
        return;
      }
      takeStep(direction);
    },

    play(nextRate) {
      pendingStep = null;
      // Playback runs on the clock: the pinned agent follows it again.
      if (pin !== null) {
        unpin();
        ensure(true);
      }
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
