import {
  CLOSE,
  type Answer,
  type CallFrame,
  type ClientFrame,
  type ServerFrame,
  type SessionLimits,
} from "./frames";

/**
 * A window's caller session on takt (`/rekuest/session`, takt's
 * `docs/session-protocol.md`): one socket per window, over which it watches
 * topics (its tasks, a task's events, an agent's states, …) and calls (assign,
 * cancel, decide, …).
 *
 * The window keeps almost nothing: its session id, the newest `pos` it
 * received (reported on every ping), and the calls it still waits on. takt
 * keeps what it watches and how far it got, so a window back within the grace
 * gets exactly what it missed, and re-sending an unanswered call never does it
 * twice. What arrives twice at a resume's seam is dropped here, per topic,
 * before any listener hears it.
 */

export type SessionStatus =
  /** Not connected yet, and never was. */
  | "connecting"
  | "open"
  /** It was open; it is coming back (and will resume). */
  | "reconnecting"
  /** Disposed (the service was replaced or disconnected). */
  | "closed";

/**
 * Whether what the window shows is live, for an indicator. Live updates flow while `status` is
 * "open" and `catchingUp` is false; otherwise `since` says since when they have not.
 */
export type SessionSync = {
  status: SessionStatus;
  /** When updates stopped flowing (the socket went, or never came); null while they flow. */
  since: number | null;
  /** Back on a new session (away longer than the grace): every topic is being sent again
   *  whole, and until it is, what it shows may be out of date. */
  catchingUp: boolean;
  /** Why updates stopped, the last time they did: kept while they do not flow. */
  error: SessionError | null;
};

/** What went wrong with the session's socket: a sentence, and what the socket said. */
export type SessionError = {
  message: string;
  /** The technical part: close code, the server's reason. */
  detail?: string;
  at: number;
};

/** Why a session socket closed, as a sentence (`opened`: whether it ever opened). */
export const describeClose = (
  code: number,
  reason: string | undefined,
  opened: boolean,
  url: string,
): Omit<SessionError, "at"> => {
  const detail = `Close code ${code}${reason ? `: ${reason}` : ""}`;
  // A socket that never opened: the server was unreachable, or (when the rest of rekuest
  // answers) its gateway does not send `/rekuest/session` to takt. The browser cannot tell.
  if (!opened) {
    return {
      message: `The server did not open live updates at ${url}. If the rest of the app works, the hub's gateway may not route this path to takt yet: update the hub.`,
      detail,
    };
  }
  switch (code) {
    case CLOSE.UNAUTHORIZED:
      return { message: "The server refused this window's sign-in.", detail };
    case CLOSE.PROTOCOL:
      return { message: "The server could not read what this window sent.", detail };
    case CLOSE.IDLE:
      return { message: "The server heard nothing from this window for too long.", detail };
    case CLOSE.SUPERSEDED:
      return { message: "Another connection took this window's session over.", detail };
    case CLOSE.UNAVAILABLE:
      return { message: "Live updates are not available on the server right now.", detail };
    case 1000:
    case 1001:
      return { message: "The server closed the connection.", detail };
    case 1006:
      return { message: "The connection dropped without a word from the server.", detail };
    default:
      return { message: "The connection closed.", detail };
  }
};

/** How long a catch-up is waited for before the window stops saying it is catching up. */
const CATCH_UP_MAX_MS = 15_000;

export type TopicListener = {
  onData: (item: unknown) => void;
  /** Replace what you hold for the topic (`reason`: new, resumed, too_far_behind, …). */
  onResync: (snapshot: unknown, reason: string) => void;
  onRefused?: (error: string) => void;
};

/** A call the server refused, with its reason as a sentence. */
export class SessionRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionRefusal";
  }
}

type Pending = {
  frame: ClientFrame;
  resolve: (answer: Answer) => void;
  reject: (error: Error) => void;
};

type Topic = {
  listeners: Set<TopicListener>;
  /** The server forgot this topic (a new session after the grace): its next snapshot is a
   *  catch-up, not a first look. */
  expired: boolean;
  /** What was delivered since the topic's last RESYNC, to drop a seam's duplicates. */
  seen: Set<string>;
  /** The newest state revision delivered (state topics). */
  rev: number;
};

export type RekuestSessionOptions = {
  url: string;
  getToken: () => Promise<string>;
  clientInfo?: Record<string, unknown>;
  WebSocket?: typeof WebSocket;
};

const SEEN_LIMIT = 4096;
const REAUTH_EVERY_MS = 60_000;

/** A key for an item that may arrive twice at a seam; null when it carries none. */
const seenKey = (topic: string, item: any): string | null => {
  if (!item || typeof item !== "object") return null;
  if (topic.startsWith("task:")) return item.task_seq != null ? `e${item.task_seq}` : null;
  if (topic.startsWith("tasks:")) {
    if (item.event?.task_seq != null) return `e${item.event.task}:${item.event.task_seq}`;
    if (item.create?.id) return `c${item.create.id}`;
    return null;
  }
  if (topic.startsWith("children:") || topic.startsWith("agent:")) {
    const change = item.create ?? item.update;
    return change?.id ? `${item.create ? "c" : "u"}${change.id}:${change.revision}` : null;
  }
  if (topic.startsWith("probe:")) return item.seq != null ? `p${item.seq}` : null;
  return null;
};

const isStateTopic = (topic: string) => topic.startsWith("state:") || topic.startsWith("states:");

export class RekuestSession {
  private options: RekuestSessionOptions;
  private socket: WebSocket | null = null;
  private status: SessionStatus = "connecting";
  private statusListeners = new Set<() => void>();
  private sync: SessionSync = {
    status: "connecting",
    since: Date.now(),
    catchingUp: false,
    error: null,
  };
  private error: SessionError | null = null;
  /** What the server said in its CLOSING frame, for the close that follows. */
  private closingReason: string | null = null;
  /** Why this window closed its own socket, for the close that follows. */
  private closedBecause: Omit<SessionError, "at"> | null = null;
  /** Topics a new session still owes their first snapshot (see `SessionSync.catchingUp`). */
  private owed = new Set<string>();
  private catchUpTimer: ReturnType<typeof setTimeout> | null = null;
  private session: string | null = null;
  private lastPos = 0;
  private everOpen = false;
  private attempt = 0;
  private topics = new Map<string, Topic>();
  /** Topics dropped while the socket was down: told to the server once it is back. */
  private dropped = new Set<string>();
  private pending = new Map<string, Pending>();
  private limits: SessionLimits | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private pinger: ReturnType<typeof setInterval> | null = null;
  private reauther: ReturnType<typeof setInterval> | null = null;
  private disposed = false;
  private counter = 0;
  /** Whether this socket was welcomed: until then only HELLO may go out (takt closes a
   *  socket whose first frame is anything else), and what waits is sent on WELCOME. */
  private welcomed = false;

  constructor(options: RekuestSessionOptions) {
    this.options = options;
    this.connect();
  }

  // -----------------------------------------------------------------------------------------
  // status

  getStatus = (): SessionStatus => this.status;

  /** Whether updates flow, and since when they have not (same listeners as the status). */
  getSync = (): SessionSync => this.sync;

  subscribeStatus = (listener: () => void): (() => void) => {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  };

  /** The session's id, once the server gave one. */
  get id(): string | null {
    return this.session;
  }

  private setStatus(status: SessionStatus) {
    if (this.status === status) return;
    this.status = status;
    this.publish();
  }

  /** Tell the listeners, with a fresh `sync` if anything in it changed. */
  private publish() {
    const flowing = this.status === "open";
    const since = flowing ? null : (this.sync.since ?? Date.now());
    const catchingUp = flowing && this.owed.size > 0;
    const error = flowing ? null : this.error;
    const sync = this.sync;
    if (
      sync.status !== this.status ||
      sync.since !== since ||
      sync.catchingUp !== catchingUp ||
      sync.error !== error
    ) {
      this.sync = { status: this.status, since, catchingUp, error };
    }
    for (const listener of [...this.statusListeners]) listener();
  }

  private owe(topics: Iterable<string>) {
    for (const topic of topics) this.owed.add(topic);
    if (this.catchUpTimer) clearTimeout(this.catchUpTimer);
    this.catchUpTimer = null;
    if (this.owed.size === 0) return;
    // A snapshot that never comes (a topic the server refuses now) does not keep the window
    // saying so for ever.
    this.catchUpTimer = setTimeout(() => this.settle([...this.owed]), CATCH_UP_MAX_MS);
  }

  private settle(topics: Iterable<string>) {
    let changed = false;
    for (const topic of topics) changed = this.owed.delete(topic) || changed;
    if (!changed) return;
    if (this.owed.size === 0 && this.catchUpTimer) {
      clearTimeout(this.catchUpTimer);
      this.catchUpTimer = null;
    }
    this.publish();
  }

  // -----------------------------------------------------------------------------------------
  // the socket

  private connect() {
    if (this.disposed) return;
    const Socket = this.options.WebSocket ?? WebSocket;
    let opened = false;
    let socket: WebSocket;
    try {
      socket = new Socket(this.options.url);
    } catch (e) {
      console.warn("[rekuest] the session socket could not be made:", e);
      this.fail({ message: "This window could not open its live-updates socket.", detail: String(e) });
      this.retry();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      opened = true;
      void this.options
        .getToken()
        .then((token) =>
          this.send({
            type: "HELLO",
            token,
            session: this.session,
            last_pos: this.lastPos,
            client_info: this.options.clientInfo ?? {},
          }),
        )
        .catch((e) => {
          console.warn("[rekuest] no token for the session:", e);
          this.closedBecause = {
            message: "This window has no sign-in to open live updates with.",
            detail: e instanceof Error ? e.message : String(e),
          };
          socket.close();
        });
    };
    socket.onmessage = (event) => {
      let frame: ServerFrame;
      try {
        frame = JSON.parse(String(event.data));
      } catch {
        return;
      }
      this.onFrame(frame);
    };
    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.welcomed = false;
      this.stopTimers();
      if (this.disposed) return;
      if (event.code === CLOSE.UNAUTHORIZED) {
        // The token was refused: the next attempt asks for a fresh one.
        console.warn("[rekuest] the session's token was refused; trying again with a fresh one");
      }
      if (!opened && !this.everOpen) {
        // A server without a session route never opens one: said, then tried again.
        console.warn(`[rekuest] could not open the session at ${this.options.url}; trying again`);
      }
      // Why: the window's own reason when it closed the socket, else what the server said.
      const reason = event.reason || this.closingReason || undefined;
      this.error = {
        ...(this.closedBecause ?? describeClose(event.code, reason, opened, this.options.url)),
        at: Date.now(),
      };
      this.closingReason = null;
      this.closedBecause = null;
      this.setStatus(this.everOpen ? "reconnecting" : "connecting");
      this.publish();
      this.retry();
    };
  }

  private retry() {
    if (this.disposed) return;
    const wait = Math.min(30_000, 1_000 * 2 ** Math.min(this.attempt, 5)) + Math.random() * 1_000;
    this.attempt += 1;
    this.timers.push(setTimeout(() => this.connect(), wait));
  }

  private send(frame: ClientFrame): boolean {
    const socket = this.socket;
    if (!socket || socket.readyState !== 1) return false;
    if (!this.welcomed && frame.type !== "HELLO") return false;
    socket.send(JSON.stringify(frame));
    return true;
  }

  private stopTimers() {
    if (this.pinger) clearInterval(this.pinger);
    if (this.reauther) clearInterval(this.reauther);
    this.pinger = null;
    this.reauther = null;
  }

  private onFrame(frame: ServerFrame) {
    if ("pos" in frame && typeof frame.pos === "number" && frame.pos > this.lastPos) {
      this.lastPos = frame.pos;
    }
    switch (frame.type) {
      case "WELCOME":
        return this.onWelcome(frame.session, frame.resumed, frame.limits);
      case "DATA":
        return this.onData(frame.topic, frame.item);
      case "RESYNC":
        return this.onResync(frame.topic, frame.snapshot, frame.reason);
      case "ASSIGNED":
      case "ACCEPTED": {
        const pending = this.pending.get(frame.request);
        if (!pending) return;
        this.pending.delete(frame.request);
        this.publish();
        pending.resolve(frame);
        return;
      }
      case "REFUSED": {
        if (frame.request) {
          const pending = this.pending.get(frame.request);
          if (!pending) return;
          this.pending.delete(frame.request);
          this.publish();
          pending.reject(new SessionRefusal(frame.error));
        } else if (frame.topic) {
          // A feed that will not come: said, so a dead list is not a mystery.
          console.warn(`[rekuest] the session would not follow ${frame.topic}:`, frame.error);
          this.settle([frame.topic]);
          for (const listener of this.topics.get(frame.topic)?.listeners ?? []) {
            listener.onRefused?.(frame.error);
          }
        } else {
          console.warn("[rekuest] the session refused a frame:", frame.error);
        }
        return;
      }
      case "CLOSING":
        this.closingReason = frame.reason;
        return;
      default:
        return;
    }
  }

  /** Something went wrong before a socket could close: kept as the reason, said at once. */
  private fail(error: Omit<SessionError, "at">) {
    this.error = { ...error, at: Date.now() };
    this.publish();
  }

  private onWelcome(session: string, resumed: boolean, limits: SessionLimits) {
    if (!resumed) {
      this.lastPos = 0;
      // A new session where there was one (gone longer than its grace): the server watches
      // nothing of ours any more, and what it sends again is a catch-up for every topic.
      if (this.session !== null) {
        for (const topic of this.topics.values()) topic.expired = true;
        this.owe(this.topics.keys());
      }
    }
    this.session = session;
    this.limits = limits;
    this.everOpen = true;
    this.welcomed = true;
    this.attempt = 0;
    this.setStatus("open");
    // What changed while the socket was down: the server resumed the watches it had;
    // a topic watched since is new to it (a WATCH it already has is ignored), and a
    // dropped one is told.
    for (const topic of this.dropped) this.send({ type: "UNWATCH", topic });
    this.dropped.clear();
    for (const topic of this.topics.keys()) this.send({ type: "WATCH", topic });
    // Calls still unanswered: sent again under their ids, answered once.
    for (const pending of this.pending.values()) this.send(pending.frame);
    this.stopTimers();
    const every = Math.max(1, limits.ping_interval) * 1000;
    this.pinger = setInterval(() => this.send({ type: "PING", pos: this.lastPos }), every);
    this.reauther = setInterval(() => {
      void this.options
        .getToken()
        .then((token) => this.send({ type: "REAUTH", token }))
        .catch(() => undefined);
    }, REAUTH_EVERY_MS);
  }

  private onData(name: string, item: unknown) {
    const topic = this.topics.get(name);
    if (!topic) return;
    if (isStateTopic(name)) {
      const rev = (item as { global_rev?: number })?.global_rev;
      if (typeof rev === "number") {
        if (rev <= topic.rev) return;
        topic.rev = rev;
      }
    } else {
      const key = seenKey(name, item);
      if (key) {
        if (topic.seen.has(key)) return;
        topic.seen.add(key);
        if (topic.seen.size > SEEN_LIMIT) {
          topic.seen.delete(topic.seen.values().next().value as string);
        }
      }
    }
    for (const listener of [...topic.listeners]) listener.onData(item);
  }

  private onResync(name: string, snapshot: unknown, reason: string) {
    this.settle([name]);
    const topic = this.topics.get(name);
    if (!topic) return;
    if (topic.expired && reason === "new") reason = "session_expired";
    topic.expired = false;
    topic.seen.clear();
    topic.rev = (snapshot as { global_rev?: number })?.global_rev ?? 0;
    const events = (snapshot as { events?: { task_seq?: number | null }[] })?.events;
    for (const event of events ?? []) {
      if (event.task_seq != null) topic.seen.add(`e${event.task_seq}`);
    }
    for (const listener of [...topic.listeners]) listener.onResync(snapshot, reason);
  }

  // -----------------------------------------------------------------------------------------
  // what the app uses

  /**
   * Follow a topic. The first listener of a topic makes the server watch it (its snapshot
   * comes as `onResync`); the last one to leave stops it. Returns the unsubscribe.
   */
  watch(name: string, listener: TopicListener): () => void {
    let topic = this.topics.get(name);
    if (!topic) {
      topic = { listeners: new Set(), seen: new Set(), rev: 0, expired: false };
      this.topics.set(name, topic);
      this.dropped.delete(name);
      this.send({ type: "WATCH", topic: name });
      this.publish();
    }
    topic.listeners.add(listener);
    return () => {
      const current = this.topics.get(name);
      if (!current) return;
      current.listeners.delete(listener);
      if (current.listeners.size > 0) return;
      this.topics.delete(name);
      this.settle([name]);
      this.publish();
      if (!this.send({ type: "UNWATCH", topic: name })) this.dropped.add(name);
    };
  }

  /**
   * Ask the server to do something. Resolves with its answer (`ASSIGNED`, `ACCEPTED`);
   * rejects with a `SessionRefusal` saying why it was refused. A call sent while the socket is
   * down goes out when it is back, and one whose answer was lost is sent again, under the same
   * id: answered once.
   */
  call<A extends Answer = Answer>(frame: CallFrame): Promise<A> {
    if (this.disposed) {
      return Promise.reject(new Error("The session was closed."));
    }
    this.counter += 1;
    const request = `${Date.now().toString(36)}-${this.counter}-${Math.random().toString(36).slice(2, 8)}`;
    const full = { ...frame, request } as ClientFrame;
    return new Promise<A>((resolve, reject) => {
      this.pending.set(request, {
        frame: full,
        resolve: resolve as (answer: Answer) => void,
        reject,
      });
      this.send(full);
      this.publish();
    });
  }

  /** The limits the server told, once open. */
  getLimits(): SessionLimits | null {
    return this.limits;
  }

  /** Where the socket goes. */
  getUrl(): string {
    return this.options.url;
  }

  /** The last time updates stopped, and why: kept after they flow again (for a status page). */
  getLastError(): SessionError | null {
    return this.error;
  }

  /** What this window follows and waits for, for a status page (`subscribeStatus` tells changes). */
  getActivity = (): string => `${this.topics.size}:${this.pending.size}`;

  /** The topics followed, by name. */
  getTopics(): string[] {
    return [...this.topics.keys()];
  }

  /** How many calls still wait for their answer. */
  getPendingCount(): number {
    return this.pending.size;
  }

  dispose() {
    this.disposed = true;
    this.stopTimers();
    if (this.catchUpTimer) clearTimeout(this.catchUpTimer);
    this.owed.clear();
    for (const timer of this.timers) clearTimeout(timer);
    for (const pending of this.pending.values()) {
      pending.reject(new Error("The session was closed."));
    }
    this.pending.clear();
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000);
    this.setStatus("closed");
  }
}
