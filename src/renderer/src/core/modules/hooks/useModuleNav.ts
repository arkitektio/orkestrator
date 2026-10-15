import { useMemo } from "react";

import { type CatalogRoute, routeCatalog, routesOfModule } from "@/core/command/sources/routeCatalog";
import { useRoles } from "@/core/connection/roles";
import { useModuleHostVersion } from "@/core/modules/host/host";

/**
 * A module's pages, grouped: its `home` page apart, the rest by their `group`
 * in first-appearance order. The one shape behind the module's right-click
 * card on its rail tile and the page list on its home page, so the two cannot
 * drift.
 */
export type ModuleNavLayout = {
  home?: CatalogRoute;
  groups: { title: string; links: CatalogRoute[] }[];
};

/** The group a link without one falls into. */
const DEFAULT_GROUP = "Pages";

export const layoutModuleNav = (links: readonly CatalogRoute[]): ModuleNavLayout => {
  const home = links.find((link) => link.home);
  const groups = new Map<string, CatalogRoute[]>();
  for (const link of links) {
    if (link === home) continue;
    const title = link.group ?? DEFAULT_GROUP;
    const group = groups.get(title);
    if (group) group.push(link);
    else groups.set(title, [link]);
  }
  return { home, groups: [...groups].map(([title, links]) => ({ title, links })) };
};

/**
 * One module's pages for the current user (role-filtered), re-read when a
 * module arrives or leaves. `moduleKey` is the module's namespace.
 */
export const useModuleNav = (moduleKey: string): ModuleNavLayout => {
  const version = useModuleHostVersion();
  const { roles } = useRoles();
  return useMemo(
    () => layoutModuleNav(routesOfModule(routeCatalog(), moduleKey, roles)),
    // `version` is the dependency: the catalog is rebuilt when it moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moduleKey, version, roles],
  );
};

/**
 * Where "open this module" goes: the page its `navLinks` mark `home`, else
 * `fallback` (the module's root). Not a hook — for a palette row or any other
 * one-off navigation; components that render it use `useModuleNav`.
 */
export const moduleHomeRoute = (moduleKey: string, fallback: string): string =>
  routesOfModule(routeCatalog(), moduleKey).find((link) => link.home)?.route ?? fallback;
