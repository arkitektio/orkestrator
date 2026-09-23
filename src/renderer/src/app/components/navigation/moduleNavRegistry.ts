import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Each module's in-module navigation, hoisted into the rail.
 *
 * These used to live in a resizable pane of their own, next to the page
 * (`ModuleLayout`'s left panel), each with its own search box. The search boxes
 * are gone — ⌘K searches every module at once now, so a per-module one was a
 * second, worse answer to the same question — and the link lists moved here, so
 * there is one sidebar rather than a sidebar next to a sidebar.
 *
 * Lazily imported, one chunk per module, so opening the app does not pull in
 * every module's pane code for the one rail section that will be shown.
 */
// Panes take no props they require; `blok`'s declares an unused props object.
type NavComponent = LazyExoticComponent<ComponentType>;
type PaneLoader = () => Promise<{ NavigationPane: ComponentType<Record<string, never>> }>;

const LOADERS: Record<string, PaneLoader> = {
  mikro: () => import("@/mikro-next/panes/StandardPane"),
  rekuest: () => import("@/rekuest/panes/StandardPane"),
  kraph: () => import("@/kraph/panes/StandardPane"),
  elektro: () => import("@/elektro/panes/StandardPane"),
  kabinet: () => import("@/kabinet/panes/StandardPane"),
  alpaka: () => import("@/alpaka/panes/StandardPane"),
  team: () => import("@/lok-next/panes/StandardPane"),
  lovekit: () => import("@/lovekit/panes/StandardPane"),
  dokuments: () => import("@/dokuments/panes/StandardPane"),
  omero_ark: () => import("@/omero-ark/panes/StandardPane"),
  fluss: () => import("@/reaktion/panes/SearchPane"),
  blok: () => import("@/blok/panes/StandardPane"),
};

/**
 * One promise per module, shared by `lazy` and `preloadModuleNav`: a chunk
 * warmed ahead of the hover is the very one `lazy` then resolves with, so the
 * card renders without suspending.
 */
const pending = new Map<string, ReturnType<PaneLoader>>();
const load = (key: string) => {
  let promise = pending.get(key);
  if (!promise) {
    promise = LOADERS[key]();
    // A failed fetch (offline, a redeploy) should be retried on the next hover,
    // not cached as a permanent failure.
    promise.catch(() => pending.delete(key));
    pending.set(key, promise);
  }
  return promise;
};

/** Fetch a module's pane chunk ahead of its card opening. */
export const preloadModuleNav = (key: string): void => {
  if (key in LOADERS) void load(key).catch(() => undefined);
};

export const MODULE_NAV: Record<string, NavComponent> = Object.fromEntries(
  Object.keys(LOADERS).map((key) => [
    key,
    lazy(async () => ({ default: (await load(key)).NavigationPane as ComponentType })),
  ]),
);

/**
 * Which module a path belongs to.
 *
 * Derived from the URL rather than tracked, so it stays right no matter how the
 * user got there — a deep link, a local action, the back button.
 */
export const moduleKeyForPath = (
  pathname: string,
  routes: { key: string; route: string }[],
): string | undefined =>
  routes.find(
    ({ route }) => pathname === route || pathname.startsWith(`${route}/`),
  )?.key;
