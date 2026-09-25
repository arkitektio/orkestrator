import { moduleNavLinks } from "@/core/modules/registries";
import { derived } from "@/core/modules/host/lazy";
import { rankByFilter } from "../filter";

/** A page inside a module, as its rail pane links to it. */
export type CatalogRoute = {
  /** The module's key in `moduleRegistry` — gates the row on the service being up. */
  module: string;
  label: string;
  route: string;
  /** Extra words that should find the page but need not be shown. */
  keywords?: string[];
};

/** The host's own pages (blok is the host's renderer, not a module). */
const HOST_ROUTES: CatalogRoute[] = [
  { module: "blok", label: "Dashboard", route: "/blok" },
  { module: "blok", label: "Dashboards", route: "/blok/dashboards" },
  { module: "blok", label: "Bloks", route: "/blok/bloks" },
];

/**
 * Every static page each module's pane links to, as data: each module's
 * `navLinks` builtin plus the host's own pages. Derived, so a module arriving
 * brings its pages.
 *
 * The panes themselves are bespoke JSX (icons, groups, live sections), so the
 * palette cannot read them; each module writes the same list down, so "tasks"
 * finds Rekuest › Tasks without opening a module first. `routeCatalog.test.ts`
 * parses the panes' source and fails the moment one of them adds, renames or
 * drops a link that is not mirrored — the two cannot drift silently.
 */
export const routeCatalog = derived((): CatalogRoute[] => [...moduleNavLinks(), ...HOST_ROUTES]);

/**
 * The pages worth offering for what was typed.
 *
 * Only for modules whose service is up — a page in a module that is down is a
 * dead end — and only once something is typed: sixty-odd pages with nothing
 * typed is noise, not navigation. Matched on the page's name, its route and
 * its keywords, and on the module's name, so "rekuest tasks" and "tasks" both
 * find it — fuzzily, and best match first, so "taks" finds Tasks at the top.
 */
export const searchRoutes = (
  catalog: readonly CatalogRoute[],
  readyModules: readonly { key: string; label?: string }[],
  filter: string | undefined,
  limit = 10,
): CatalogRoute[] => {
  const term = filter?.trim();
  if (!term) return [];
  const ready = new Map(readyModules.map((m) => [m.key, m.label ?? m.key]));
  return rankByFilter(
    catalog.filter((r) => ready.has(r.module)),
    (r) => [r.label, r.route, ready.get(r.module), ...(r.keywords ?? [])],
    term,
    limit,
  );
};
