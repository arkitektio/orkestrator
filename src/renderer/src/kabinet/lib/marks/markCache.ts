/**
 * markCache.ts — the key, the LRU and the idle queue.
 *
 * Static imports here are load-bearing: this module must stay reachable without
 * pulling `three` or the 83 kB of spec/glyph JSON into the kabinet route's
 * chunk. That is the whole reason `hash.ts` and `constants.ts` exist separately
 * from `markParams.ts`. The renderer arrives through a dynamic `import()`
 * below, once, on the first cache miss.
 */
import { MARK_SPEC_VERSION } from "./constants";
import { cyrb53 } from "./hash";

export interface MarkRequest {
  name: string;
  identifier?: string;
  embedding?: string | null;
  /** Device pixels, already quantised by `markPixels`. */
  px: number;
  simple: boolean;
}

/**
 * The spec version leads the key because refitting the anchors changes every
 * mark. The embedding is hashed rather than inlined — it is ~700 base64
 * characters and would otherwise dominate the memory of a 200-entry map. The
 * name is kept whole: only its first character matters today, but keying on
 * that would break silently the moment the letter rule changes.
 */
export const markKey = (r: MarkRequest): string =>
  `${MARK_SPEC_VERSION}|${r.identifier ?? ""}|${r.name}|` +
  `${r.embedding ? cyrb53(r.embedding).toString(36) : "-"}|` +
  `${r.simple ? "s" : "f"}|${r.px}`;

/**
 * Quantise to powers of two so the size-12, size-14, size-20 and size-24 call
 * sites share cache entries instead of each rendering their own.
 */
export const markPixels = (cssSize: number): number => {
  const dpr = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  return Math.min(512, Math.max(64, 2 ** Math.ceil(Math.log2(Math.max(1, cssSize * dpr)))));
};

/** Below roughly 48 px the orbiting extras turn to mush. */
export const markSimple = (cssSize: number): boolean => cssSize < 48;

/* ---------------- LRU ---------------- */

/** ~8-15 kB per 256² PNG data URL, so this is a couple of megabytes at most. */
const CAP = 200;
const cache = new Map<string, string>();

export const cacheGet = (key: string): string | undefined => {
  const hit = cache.get(key);
  if (hit !== undefined) {
    cache.delete(key); // refresh recency: a Map iterates in insertion order
    cache.set(key, hit);
  }
  return hit;
};

/** The queue's writer. Exported so the eviction rule can be tested directly. */
export const cacheSet = (key: string, value: string) => {
  cache.set(key, value);
  if (cache.size > CAP) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
};

/** Test seam. */
export const clearMarkCache = () => cache.clear();

/* ---------------- the queue ---------------- */

type Listener = (src: string | null) => void;

interface Job {
  request: MarkRequest;
  listeners: Set<Listener>;
}

const pending = new Map<string, Job>();
const queue: string[] = [];
let scheduled = false;
let renderer: Promise<typeof import("./offscreen")> | null = null;

const loadRenderer = () => (renderer ??= import("./offscreen"));

const schedule = () => {
  if (scheduled) return;
  scheduled = true;
  const run = () => {
    scheduled = false;
    void drain();
  };
  if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 400 });
  else if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
  else setTimeout(run, 0);
};

/**
 * Drain against a wall-clock budget rather than a fixed count. The cost per
 * mark is dominated by the PNG encode plus, for a symbol seen for the first
 * time, its extrusion — doing forty of those in one commit is a several-hundred
 * millisecond stall. A budget keeps the grid interactive while it fills in.
 */
const drain = async () => {
  const mod = await loadRenderer();
  const start = performance.now();

  while (queue.length && performance.now() - start < 6) {
    const key = queue.shift();
    if (key === undefined) break;
    const job = pending.get(key);
    if (!job) continue;
    pending.delete(key);
    // Everyone waiting on this mark scrolled away: skip the work entirely.
    if (job.listeners.size === 0) continue;

    const src = mod.renderMarkPng(
      {
        name: job.request.name,
        identifier: job.request.identifier,
        embedding: job.request.embedding,
      },
      { px: job.request.px, simple: job.request.simple },
    );
    if (src) cacheSet(key, src);
    job.listeners.forEach((listener) => listener(src));
  }

  if (queue.length) schedule();
};

/**
 * Ask for a mark. Returns an unsubscribe that also drops the job if nothing
 * else is waiting on it — a fast scroll through a long list must not render
 * marks nobody will see.
 */
export const requestMark = (request: MarkRequest, listener: Listener): (() => void) => {
  const key = markKey(request);
  let job = pending.get(key);
  if (!job) {
    job = { request, listeners: new Set() };
    pending.set(key, job);
    queue.push(key);
  }
  job.listeners.add(listener);
  schedule();

  return () => {
    job.listeners.delete(listener);
  };
};
