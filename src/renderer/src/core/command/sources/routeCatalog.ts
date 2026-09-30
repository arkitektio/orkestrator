import { Blocks, Home, LayoutDashboard } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";
import { currentRoles, satisfiesRoles } from "@/core/connection/roles";
import { isModuleAllowed, moduleNavLinks } from "@/core/modules/registries";
import { derived } from "@/core/modules/host/lazy";
import { rankByFilter } from "../filter";

/** A page inside a module: a palette row, and a tile in the module's rail popout. */
export type CatalogRoute = NavLinkDecl & {
  /** The module's key in `moduleRegistry` — gates the row on the service being up. */
  module: string;
};

/** The host's own pages (blok is the host's renderer, not a module). */
const HOST_ROUTES: CatalogRoute[] = [
  { module: "blok", label: "Dashboard", route: "/blok", group: "Bloks", icon: Home, home: true },
  { module: "blok", label: "Dashboards", route: "/blok/dashboards", group: "Bloks", icon: LayoutDashboard, description: "Composed blok dashboards" },
  { module: "blok", label: "Bloks", route: "/blok/bloks", group: "Bloks", icon: Blocks, description: "Reusable UI bloks" },
];

/**
 * Every page of every module, as data: each module's `navLinks` builtin plus
 * the host's own pages. Derived, so a module arriving brings its pages.
 *
 * The one list behind both the palette's navigation rows ("tasks" finds
 * Rekuest › Tasks without opening a module first) and the popout on a module's
 * rail tile — neither has a hand-written copy to drift from it.
 */
export const routeCatalog = derived((): CatalogRoute[] => [...moduleNavLinks(), ...HOST_ROUTES]);

/** The pages a user with `roles` may be offered: the link's own `roles` and its module's. */
export const allowedRoutes = (
  catalog: readonly CatalogRoute[],
  roles: readonly string[] = currentRoles(),
): CatalogRoute[] =>
  catalog.filter((r) => satisfiesRoles(roles, r.roles) && isModuleAllowed(r.module, roles));

/** One module's pages, in declaration order, for a user with `roles`. */
export const routesOfModule = (
  catalog: readonly CatalogRoute[],
  module: string,
  roles: readonly string[] = currentRoles(),
): CatalogRoute[] => allowedRoutes(catalog, roles).filter((r) => r.module === module);

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
  roles: readonly string[] = currentRoles(),
): CatalogRoute[] => {
  const term = filter?.trim();
  if (!term) return [];
  const ready = new Map(readyModules.map((m) => [m.key, m.label ?? m.key]));
  return rankByFilter(
    allowedRoutes(catalog, roles).filter((r) => ready.has(r.module)),
    (r) => [r.label, r.route, ready.get(r.module), ...(r.keywords ?? [])],
    term,
    limit,
  );
};
