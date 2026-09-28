// @vitest-environment jsdom
// jsdom: the catalog derives Mikro's spec pages from `@/mikro/specs`, which
// reaches the generated GraphQL module and, through it, `constants.tsx`'s
// `window` read at import time.
import { describe, expect, it } from "vitest";

import { ADATASET_SPECS, arrayDatasetSpecLink } from "@/mikro/specs";

import "@/app/modules/install";
import { routeCatalog, routesOfModule, searchRoutes } from "./routeCatalog";

const ROUTE_CATALOG = routeCatalog();

describe("ROUTE_CATALOG", () => {
  it("gives every page a group and an icon, for the rail popout", () => {
    for (const r of ROUTE_CATALOG) {
      expect(r.group, `${r.module}: ${r.label}`).toBeTruthy();
      expect(r.icon, `${r.module}: ${r.label}`).toBeTruthy();
    }
  });

  it("marks at most one home page per module", () => {
    for (const module of new Set(ROUTE_CATALOG.map((r) => r.module))) {
      const homes = routesOfModule(ROUTE_CATALOG, module).filter((r) => r.home);
      expect(homes.length, module).toBeLessThanOrEqual(1);
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

  it("offers every array-dataset spec page, from the same data as the pages", () => {
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
