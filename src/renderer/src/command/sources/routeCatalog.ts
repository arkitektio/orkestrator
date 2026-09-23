import { ADATASET_SPECS, arrayDatasetSpecLink } from "@/mikro-next/specs";
import {
  ARRAY_DATASET_SPECS as ELEKTRO_ARRAY_DATASET_SPECS,
  arrayDatasetSpecLink as elektroArrayDatasetSpecLink,
} from "@/elektro/specs";

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

/**
 * Every static page each module's pane links to, as data.
 *
 * The panes themselves are bespoke JSX (icons, groups, live sections), so the
 * palette cannot read them; this is the same list written down, so "tasks"
 * finds Rekuest › Tasks without opening a module first. `routeCatalog.test.ts`
 * parses the panes' source and fails the moment one of them adds, renames or
 * drops a link that is not mirrored here — the two cannot drift silently.
 *
 * Sections a pane GENERATES from data (Mikro's and Elektro's one-link-per-spec
 * lists: Images, Timeseries, …) are generated here from the same data, so those cannot
 * drift at all.
 */
export const ROUTE_CATALOG: CatalogRoute[] = [
  // mikro
  { module: "mikro", label: "Dashboard", route: "/mikro/home", keywords: ["images", "home"] },
  { module: "mikro", label: "Array Datasets", route: "/mikro/arraydatasets", keywords: ["images", "stacks"] },
  // One page per array-dataset spec, exactly as the pane lists them.
  ...ADATASET_SPECS.map<CatalogRoute>((spec) => ({
    module: "mikro",
    label: spec.label,
    route: arrayDatasetSpecLink(spec.slug),
    keywords: ["array datasets", "spec", spec.slug],
  })),
  { module: "mikro", label: "Coordinate Systems", route: "/mikro/coordinatesystems" },
  { module: "mikro", label: "Table Datasets", route: "/mikro/tabledatasets", keywords: ["tables"] },
  { module: "mikro", label: "Sparse Datasets", route: "/mikro/sparsedatasets", keywords: ["matrices", "sparse", "csr", "anndata"] },
  { module: "mikro", label: "Annotations", route: "/mikro/annotations", keywords: ["rois", "labels"] },
  { module: "mikro", label: "Folders", route: "/mikro/folders" },
  { module: "mikro", label: "Files", route: "/mikro/files" },
  { module: "mikro", label: "Scenes", route: "/mikro/scenes", keywords: ["3d", "viewer"] },
  // rekuest
  { module: "rekuest", label: "Home", route: "/rekuest/home" },
  { module: "rekuest", label: "Actions", route: "/rekuest/actions", keywords: ["nodes", "functions"] },
  { module: "rekuest", label: "Tasks", route: "/rekuest/tasks", keywords: ["assignations", "runs"] },
  { module: "rekuest", label: "Org Tasks", route: "/rekuest/org-tasks", keywords: ["organization"] },
  { module: "rekuest", label: "Implementations", route: "/rekuest/implementations", keywords: ["templates"] },
  { module: "rekuest", label: "Toolboxes", route: "/rekuest/toolboxes" },
  { module: "rekuest", label: "Spaces", route: "/rekuest/spaces" },
  { module: "rekuest", label: "Dashboards", route: "/rekuest/dashboards" },
  { module: "rekuest", label: "Bloks", route: "/rekuest/bloks" },
  { module: "rekuest", label: "Shortcuts", route: "/rekuest/shortcuts" },
  // kraph
  { module: "kraph", label: "Dashboard", route: "/kraph/home", keywords: ["knowledge", "graph"] },
  { module: "kraph", label: "Terms", route: "/kraph/terms" },
  { module: "kraph", label: "Graphs", route: "/kraph/graphs" },
  { module: "kraph", label: "Structures", route: "/kraph/structurekinds" },
  { module: "kraph", label: "Entities", route: "/kraph/entitycategories" },
  { module: "kraph", label: "Protocol Events", route: "/kraph/protocoleventcategories" },
  { module: "kraph", label: "Natural Events", route: "/kraph/naturaleventcategories" },
  { module: "kraph", label: "Relations", route: "/kraph/relationcategories" },
  { module: "kraph", label: "Structure Relations", route: "/kraph/structurerelationcategories" },
  { module: "kraph", label: "Metrics", route: "/kraph/metrickinds" },
  { module: "kraph", label: "Measurements", route: "/kraph/measurementcategories", keywords: ["measurements"] },
  // elektro
  { module: "elektro", label: "Home", route: "/elektro" },
  { module: "elektro", label: "Experiments", route: "/elektro/experiments" },
  { module: "elektro", label: "Neuron models", route: "/elektro/neuronmodels" },
  { module: "elektro", label: "Model Collections", route: "/elektro/modelcollections" },
  { module: "elektro", label: "Workspaces", route: "/elektro/modelworkspaces" },
  { module: "elektro", label: "Datasets", route: "/elektro/arraydatasets" },
  { module: "elektro", label: "Files", route: "/elektro/files" },
  // One page per elektro array-dataset spec, exactly as the pane lists them.
  ...ELEKTRO_ARRAY_DATASET_SPECS.map<CatalogRoute>((spec) => ({
    module: "elektro",
    label: spec.label,
    route: elektroArrayDatasetSpecLink(spec.slug),
    keywords: ["datasets", "recordings", "spec", spec.slug],
  })),
  // kabinet
  { module: "kabinet", label: "Dashboard", route: "/kabinet/home" },
  { module: "kabinet", label: "App Store", route: "/kabinet/app-store", keywords: ["install", "apps"] },
  { module: "kabinet", label: "Repos", route: "/kabinet/repos", keywords: ["repositories"] },
  { module: "kabinet", label: "Pods", route: "/kabinet/pods", keywords: ["containers"] },
  // alpaka
  { module: "alpaka", label: "Home", route: "/alpaka" },
  { module: "alpaka", label: "Rooms", route: "/alpaka/rooms", keywords: ["chat", "talk"] },
  { module: "alpaka", label: "Collections", route: "/alpaka/collections" },
  { module: "alpaka", label: "Models", route: "/alpaka/llmmodels", keywords: ["llm"] },
  { module: "alpaka", label: "Providers", route: "/alpaka/providers" },
  // team (the lok module)
  { module: "team", label: "Members", route: "/team", keywords: ["people", "organization", "users"] },
  { module: "team", label: "Me", route: "/team/me", keywords: ["profile", "account"] },
  { module: "team", label: "Overview", route: "/team/overview", keywords: ["dashboard", "lok"] },
  { module: "team", label: "Users", route: "/team/users" },
  { module: "team", label: "Apps", route: "/team/apps", keywords: ["clients"] },
  { module: "team", label: "Services", route: "/team/services" },
  { module: "team", label: "Instances", route: "/team/instances" },
  { module: "team", label: "Redeem Tokens", route: "/team/redeemtokens" },
  { module: "team", label: "Devices", route: "/team/devices", keywords: ["compute", "nodes"] },
  // lovekit
  { module: "lovekit", label: "Dashboard", route: "/lovekit" },
  { module: "lovekit", label: "Streams", route: "/lovekit/streams" },
  { module: "lovekit", label: "Solo Broadcasts", route: "/lovekit/solobroadcasts" },
  // omero_ark
  { module: "omero_ark", label: "Dashboard", route: "/omero_ark" },
  { module: "omero_ark", label: "Datasets", route: "/omero_ark/datasets" },
  { module: "omero_ark", label: "Projects", route: "/omero_ark/projects" },
  // blok
  { module: "blok", label: "Dashboard", route: "/blok" },
  { module: "blok", label: "Dashboards", route: "/blok/dashboards" },
  { module: "blok", label: "Bloks", route: "/blok/bloks" },
  // fluss
  { module: "fluss", label: "Dashboard", route: "/fluss/home", keywords: ["workflows", "flows"] },
];

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
