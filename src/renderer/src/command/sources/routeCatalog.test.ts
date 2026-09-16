// @vitest-environment jsdom
// jsdom, not node: the catalog derives Mikro's spec pages from `@/mikro-next/specs`,
// which reaches the generated GraphQL module and, through it, `constants.tsx`'s
// `window` read at import time. `node:fs` still works under jsdom.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { ADATASET_SPECS, arrayDatasetSpecLink } from "@/mikro-next/specs";

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

/**
 * Links a pane renders FROM DATA rather than writing out — invisible to the
 * regex above, so they are reproduced here from the same data the pane maps.
 */
const GENERATED: Record<string, () => [route: string, label: string][]> = {
  mikro: () => ADATASET_SPECS.map((spec) => [arrayDatasetSpecLink(spec.slug), spec.label]),
};

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

const linksOfModule = (module: string, file: string): Map<string, string> => {
  const links = linksInPane(file);
  for (const [route, label] of GENERATED[module]?.() ?? []) links.set(route, label);
  return links;
};

describe("ROUTE_CATALOG", () => {
  it("mirrors every module pane's links exactly — no drift either way", () => {
    // If this fails, a pane gained, lost or renamed a link: update the catalog.
    for (const [module, file] of Object.entries(PANES)) {
      const inPane = linksOfModule(module, file);
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

  it("finds a page by a subsequence of its name", () => {
    expect(searchRoutes(ROUTE_CATALOG, ready, "arrdat")[0]?.route).toBe("/mikro/arraydatasets");
  });

  it("forgives a typo", () => {
    expect(searchRoutes(ROUTE_CATALOG, ready, "taks")[0]?.route).toBe("/rekuest/tasks");
  });

  it("puts the best match first", () => {
    expect(searchRoutes(ROUTE_CATALOG, ready, "tasks").map((r) => r.route).slice(0, 2)).toEqual([
      "/rekuest/tasks",
      "/rekuest/org-tasks",
    ]);
    // Rekuest's page is literally "Home"; Mikro's only has it as a keyword.
    expect(searchRoutes(ROUTE_CATALOG, ready, "home")[0]?.route).toBe("/rekuest/home");
  });

  it("offers every array-dataset spec page, from the same data as the pane", () => {
    expect(searchRoutes(ROUTE_CATALOG, ready, "images")[0]?.route).toBe("/mikro/arraydatasets/spec/image");
    expect(searchRoutes(ROUTE_CATALOG, ready, "volumes")[0]?.route).toBe("/mikro/arraydatasets/spec/volume");
    expect(searchRoutes(ROUTE_CATALOG, ready, "flim")[0]?.route).toBe("/mikro/arraydatasets/spec/flim");
    // Every spec, not a hand-picked few.
    for (const spec of ADATASET_SPECS) {
      expect(ROUTE_CATALOG.map((r) => r.route)).toContain(arrayDatasetSpecLink(spec.slug));
    }
  });

  it("caps after ranking, not before", () => {
    // Insertion order would have returned Mikro's Dashboard.
    expect(searchRoutes(ROUTE_CATALOG, ready, "home", 1).map((r) => r.route)).toEqual(["/rekuest/home"]);
  });
});
