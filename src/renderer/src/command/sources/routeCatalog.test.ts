import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { ROUTE_CATALOG, searchRoutes } from "./routeCatalog";

/**
 * Where each module's pane lives. `dokuments` is left out on purpose: its pane
 * links to `/lovekit/*` (a copy of lovekit's), which is a bug in that pane,
 * not a set of pages to offer.
 */
const PANES: Record<string, string> = {
  mikro: "mikro-next/panes/StandardPane.tsx",
  rekuest: "rekuest/panes/StandardPane.tsx",
  kraph: "kraph/panes/StandardPane.tsx",
  elektro: "elektro/panes/StandardPane.tsx",
  kabinet: "kabinet/panes/StandardPane.tsx",
  alpaka: "alpaka/panes/StandardPane.tsx",
  lok: "lok-next/panes/StandardPane.tsx",
  lovekit: "lovekit/panes/StandardPane.tsx",
  omero_ark: "omero-ark/panes/StandardPane.tsx",
  blok: "blok/panes/StandardPane.tsx",
  fluss: "reaktion/panes/SearchPane.tsx",
};

const LINK = /<(PaneLink|DroppableNavLink|NavLink|Link)\b[^>]*?to="(\/[^"]*)"[^>]*>(.*?)<\/\1>/gs;

/** The static links a pane's source declares, as `route → label`. */
const linksInPane = (file: string): Map<string, string> => {
  const src = readFileSync(resolve(__dirname, "../..", file), "utf8");
  const links = new Map<string, string>();
  for (const m of src.matchAll(LINK)) {
    const label = m[3].replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).join(" ");
    links.set(m[2], label);
  }
  return links;
};

describe("ROUTE_CATALOG", () => {
  it("mirrors every module pane's links exactly — no drift either way", () => {
    // If this fails, a pane gained, lost or renamed a link: update the catalog.
    for (const [module, file] of Object.entries(PANES)) {
      const inPane = linksInPane(file);
      const inCatalog = new Map(
        ROUTE_CATALOG.filter((r) => r.module === module).map((r) => [r.route, r.label]),
      );
      expect(Object.fromEntries(inCatalog), `${module}: catalog vs ${file}`).toEqual(
        Object.fromEntries(inPane),
      );
    }
  });

  it("has no duplicate routes", () => {
    const routes = ROUTE_CATALOG.map((r) => r.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("finds every page by its own name", () => {
    const all = ROUTE_CATALOG.map((r) => ({ key: r.module }));
    for (const r of ROUTE_CATALOG) {
      expect(searchRoutes(ROUTE_CATALOG, all, r.label, 500).map((x) => x.route), r.label).toContain(r.route);
    }
  });
});

describe("searchRoutes", () => {
  const ready = [{ key: "rekuest", label: "Rekuest" }, { key: "mikro", label: "Mikro" }];

  it("offers nothing until something is typed", () => {
    expect(searchRoutes(ROUTE_CATALOG, ready, "")).toEqual([]);
    expect(searchRoutes(ROUTE_CATALOG, ready, "   ")).toEqual([]);
  });

  it("finds a page by name, keyword, or module name", () => {
    expect(searchRoutes(ROUTE_CATALOG, ready, "tasks").map((r) => r.route)).toContain("/rekuest/tasks");
    expect(searchRoutes(ROUTE_CATALOG, ready, "rois").map((r) => r.route)).toContain("/mikro/annotations");
    expect(searchRoutes(ROUTE_CATALOG, ready, "rekuest").length).toBeGreaterThan(0);
  });

  it("never offers a page in a module that is down", () => {
    // Kraph is not in `ready`: its pages would be dead ends.
    expect(searchRoutes(ROUTE_CATALOG, ready, "graphs")).toEqual([]);
  });

  it("caps the list", () => {
    expect(searchRoutes(ROUTE_CATALOG, ready, "a", 3)).toHaveLength(3);
  });
});
