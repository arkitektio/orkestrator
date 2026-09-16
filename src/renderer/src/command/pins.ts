import { z } from "zod";

/**
 * Routes the user has chosen to keep — the links down the left of the rail.
 *
 * Deliberately NOT browser tabs. Tabs accumulate whatever you happened to open
 * and then need managing; pins are only what you asked for, so the rail stays
 * short and everything in it is there on purpose. "Where was I" is already
 * answered by recents in the palette, which is history — this is bookmarks, and
 * keeping the two separate is what stops either from becoming noise.
 *
 * Same record shape as `recents.ts` on purpose: `{identifier, id, label}` for a
 * thing, `{route, label}` for a page. One vocabulary across the palette, the
 * recents list and the rail.
 */

export const PinSchema = z.union([
  z.object({
    kind: z.literal("entity"),
    identifier: z.string(),
    id: z.string(),
    label: z.string(),
  }),
  z.object({
    kind: z.literal("route"),
    route: z.string(),
    label: z.string(),
  }),
]);

export type Pin = z.infer<typeof PinSchema>;

export const PinStateSchema = z.object({
  version: z.literal(1),
  pins: z.array(PinSchema),
});

export type PinState = z.infer<typeof PinStateSchema>;

/** Past this the rail stops being scannable and starts being a list. */
export const MAX_PINS = 30;

/**
 * Pins belong to a MEMBERSHIP, so the key is the profile id — which is already
 * `baseUrl::user::organization`.
 *
 * There is deliberately no signed-out bucket. A pin points at a tenant-scoped
 * id, so one made with no membership behind it belongs to nobody: it could not
 * be resolved, and carrying it into whichever organization the user eventually
 * signed into would be wrong in a way that looks like the app losing track of
 * itself. Signed out, there is nothing to key by and nothing to store.
 */
export const pinsStorageKey = (profileId: string): string =>
  `orkestrator:pins:v1:${profileId}`;

export const emptyPinState = (): PinState => ({ version: 1, pins: [] });

/** What makes two records the same pin. */
export const pinKey = (pin: Pin): string =>
  pin.kind === "entity" ? `entity:${pin.identifier}:${pin.id}` : `route:${pin.route}`;

/**
 * Where a pin points.
 *
 * Entity paths resolve through `smartRegistry.buildModelPath`, passed in so this
 * module stays free of the registry and testable as pure data.
 */
export const routeOfPin = (
  pin: Pin,
  buildModelPath: (identifier: string, id: string) => string | undefined,
): string | undefined => {
  if (pin.kind === "route") {
    return pin.route;
  }
  const path = buildModelPath(pin.identifier, pin.id);
  return path ? (path.startsWith("/") ? path : `/${path}`) : undefined;
};

/**
 * Pin something, or refresh the label if it is already pinned.
 *
 * Re-pinning never reorders: the rail is a place the user arranges, and a list
 * that rearranges itself whenever you revisit something cannot be learned.
 */
export const addPin = (state: PinState, pin: Pin): PinState => {
  const key = pinKey(pin);

  if (state.pins.some((p) => pinKey(p) === key)) {
    return {
      ...state,
      pins: state.pins.map((p) =>
        pinKey(p) === key ? { ...p, label: pin.label || p.label } : p,
      ),
    };
  }

  // At the cap, refuse rather than silently dropping something the user
  // deliberately kept — unlike tabs, nothing here is disposable.
  if (state.pins.length >= MAX_PINS) {
    return state;
  }

  return { ...state, pins: [...state.pins, pin] };
};

export const removePin = (state: PinState, key: string): PinState => ({
  ...state,
  pins: state.pins.filter((p) => pinKey(p) !== key),
});

export const isPinned = (state: PinState, key: string): boolean =>
  state.pins.some((p) => pinKey(p) === key);

/** Move a pin within the rail, for drag-reordering. */
export const movePin = (state: PinState, key: string, toIndex: number): PinState => {
  const from = state.pins.findIndex((p) => pinKey(p) === key);
  if (from === -1) return state;

  const pins = [...state.pins];
  const [moved] = pins.splice(from, 1);
  pins.splice(Math.max(0, Math.min(toIndex, pins.length)), 0, moved);
  return { ...state, pins };
};

/** Does this pin cover the given path — exactly, or as an ancestor of it? */
const matchLength = (
  pin: Pin,
  pathname: string,
  buildModelPath: (identifier: string, id: string) => string | undefined,
): number => {
  const route = routeOfPin(pin, buildModelPath);
  if (!route) return -1;
  if (route === pathname) return route.length;
  // Segment-aware, so `/mikro/arraydatasets` does not claim
  // `/mikro/arraydatasets2`. A bare `startsWith` would.
  if (pathname.startsWith(`${route}/`)) return route.length;
  return -1;
};

/**
 * The pin the current path is showing, if any.
 *
 * Derived from the URL rather than stored, so a navigation from anywhere — a
 * card link, a local action, the back button — highlights the right pin without
 * any of those call sites knowing pins exist.
 *
 * Two subtleties, both of which the first version got wrong by taking whichever
 * pin happened to match first:
 *
 *  - Pins nest. With `/mikro` and `/mikro/arraydatasets/5` both pinned, standing
 *    on the latter matches BOTH, and the answer is the more specific one — the
 *    longest matching route — not whichever sits higher in the list.
 *  - Two pins can resolve to the SAME route: a route pin for
 *    `/mikro/arraydatasets/5` and an entity pin for that dataset are different
 *    records pointing at one page. Nothing in the URL can separate them, so
 *    `preferredKey` — the pin the user actually clicked — breaks the tie.
 */
export const activePinKey = (
  pins: Pin[],
  pathname: string,
  buildModelPath: (identifier: string, id: string) => string | undefined,
  preferredKey?: string,
): string | undefined => {
  let best: { key: string; length: number } | undefined;

  for (const pin of pins) {
    const length = matchLength(pin, pathname, buildModelPath);
    if (length < 0) continue;

    const key = pinKey(pin);

    // The clicked pin wins outright among equally specific matches — it is the
    // one the user pointed at, and no amount of URL inspection can recover that.
    if (key === preferredKey && (!best || length >= best.length)) {
      best = { key, length };
      continue;
    }

    if (!best || length > best.length) {
      best = { key, length };
    }
  }

  return best?.key;
};

// ── storage ──

export const loadPins = (
  profileId: string | null,
  storage: Storage = localStorage,
): PinState => {
  // No membership, no pins — see `pinsStorageKey`.
  if (!profileId) {
    return emptyPinState();
  }

  let raw: string | null = null;
  try {
    raw = storage.getItem(pinsStorageKey(profileId));
  } catch {
    return emptyPinState();
  }
  if (!raw) return emptyPinState();

  try {
    const parsed = JSON.parse(raw);
    const outer = PinStateSchema.safeParse(parsed);
    if (outer.success) return outer.data;

    // Salvage what parses: one malformed row must not unpin everything else.
    if (parsed && Array.isArray(parsed.pins)) {
      return {
        version: 1,
        pins: parsed.pins.flatMap((c: unknown) => {
          const p = PinSchema.safeParse(c);
          return p.success ? [p.data] : [];
        }),
      };
    }
    return emptyPinState();
  } catch {
    return emptyPinState();
  }
};

export const savePins = (
  profileId: string | null,
  state: PinState,
  storage: Storage = localStorage,
): void => {
  // Refuses rather than writing to a shared bucket: a pin with no membership
  // behind it would leak into whichever organization signed in next.
  if (!profileId) {
    return;
  }

  try {
    storage.setItem(pinsStorageKey(profileId), JSON.stringify(state));
  } catch {
    // Quota or blocked storage; the rail is a convenience, not state worth
    // failing over.
  }
};
