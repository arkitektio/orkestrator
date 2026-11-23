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

  constructor(options: RekuestSessionOptions) {
    this.options = options;
    this.connect();
  }

  // -----------------------------------------------------------------------------------------
  // status

  getStatus = (): SessionStatus => this.status;

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
    for (const listener of [...this.statusListeners]) listener();
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
      this.setStatus(this.everOpen ? "reconnecting" : "connecting");
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
        pending.resolve(frame);
        return;
      }
      case "REFUSED": {
        if (frame.request) {
          const pending = this.pending.get(frame.request);
          if (!pending) return;
          this.pending.delete(frame.request);
          pending.reject(new SessionRefusal(frame.error));
        } else if (frame.topic) {
          // A feed that will not come: said, so a dead list is not a mystery.
          console.warn(`[rekuest] the session would not follow ${frame.topic}:`, frame.error);
          for (const listener of this.topics.get(frame.topic)?.listeners ?? []) {
            listener.onRefused?.(frame.error);
          }
        } else {
          console.warn("[rekuest] the session refused a frame:", frame.error);
        }
        return;
      }
      default:
        return;
    }
  }

  private onWelcome(session: string, resumed: boolean, limits: SessionLimits) {
    if (!resumed) {
      this.lastPos = 0;
      // A new session where there was one (gone longer than its grace): the server watches
      // nothing of ours any more, and what it sends again is a catch-up for every topic.
      if (this.session !== null) {
        for (const topic of this.topics.values()) topic.expired = true;
      }
    }
    this.session = session;
    this.limits = limits;
    this.everOpen = true;
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
    }
    topic.listeners.add(listener);
    return () => {
      const current = this.topics.get(name);
      if (!current) return;
      current.listeners.delete(listener);
      if (current.listeners.size > 0) return;
      this.topics.delete(name);
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
    });
  }

  /** The limits the server told, once open. */
  getLimits(): SessionLimits | null {
    return this.limits;
  }

  dispose() {
    this.disposed = true;
    this.stopTimers();
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
