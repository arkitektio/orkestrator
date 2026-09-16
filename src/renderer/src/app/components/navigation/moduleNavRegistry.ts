import { lazy, type LazyExoticComponent } from "react";

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
type NavComponent = LazyExoticComponent<() => JSX.Element | null>;

const fromStandardPane = (loader: () => Promise<{ NavigationPane: () => JSX.Element }>): NavComponent =>
  lazy(async () => ({ default: (await loader()).NavigationPane })) as NavComponent;

export const MODULE_NAV: Record<string, NavComponent> = {
  mikro: fromStandardPane(() => import("@/mikro-next/panes/StandardPane")),
  rekuest: fromStandardPane(() => import("@/rekuest/panes/StandardPane")),
  kraph: fromStandardPane(() => import("@/kraph/panes/StandardPane")),
  elektro: fromStandardPane(() => import("@/elektro/panes/StandardPane")),
  kabinet: fromStandardPane(() => import("@/kabinet/panes/StandardPane")),
  alpaka: fromStandardPane(() => import("@/alpaka/panes/StandardPane")),
  lok: fromStandardPane(() => import("@/lok-next/panes/StandardPane")),
  lovekit: fromStandardPane(() => import("@/lovekit/panes/StandardPane")),
  dokuments: fromStandardPane(() => import("@/dokuments/panes/StandardPane")),
  omero_ark: fromStandardPane(() => import("@/omero-ark/panes/StandardPane")),
  fluss: fromStandardPane(() => import("@/reaktion/panes/SearchPane")),
  blok: fromStandardPane(() => import("@/blok/panes/StandardPane")),
};

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
