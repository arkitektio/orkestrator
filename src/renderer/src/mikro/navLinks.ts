import type { NavLinkDecl } from "@/core/modules/host/define";
import { ADATASET_SPECS, arrayDatasetSpecLink } from "./specs";

/**
 * mikro's pages, for the ⌘K palette (a `navLinks` builtin). Mirrors the
 * links its rail pane renders; `routeCatalog.test.ts` fails when they drift.
 */
export const MIKRO_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/mikro/home", keywords: ["images", "home"] },
  { label: "Array Datasets", route: "/mikro/arraydatasets", keywords: ["images", "stacks"] },
  // One page per array-dataset spec, exactly as the pane lists them.
  ...ADATASET_SPECS.map<NavLinkDecl>((spec) => ({
    label: spec.label,
    route: arrayDatasetSpecLink(spec.slug),
    keywords: ["array datasets", "spec", spec.slug],
  })),
  { label: "Coordinate Systems", route: "/mikro/coordinatesystems" },
  { label: "Table Datasets", route: "/mikro/tabledatasets", keywords: ["tables"] },
  { label: "Sparse Datasets", route: "/mikro/sparsedatasets", keywords: ["matrices", "sparse", "csr", "anndata"] },
  { label: "Annotations", route: "/mikro/annotations", keywords: ["rois", "labels"] },
  { label: "Folders", route: "/mikro/folders" },
  { label: "Files", route: "/mikro/files" },
  { label: "Scenes", route: "/mikro/scenes", keywords: ["3d", "viewer"] },
];
