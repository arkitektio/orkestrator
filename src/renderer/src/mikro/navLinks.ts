import { Axis3d, ChartSpline, Clapperboard, File, Folder, Grid2x2, Grid3x3, Home, PenTool, ScanSearch, Table2 } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";
import { ADATASET_SPECS, arrayDatasetSpecLink } from "./specs";

/** mikro's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const MIKRO_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/mikro/home", keywords: ["images", "home"], group: "Data", icon: Home, home: true },
  { label: "Array Datasets", route: "/mikro/arraydatasets", keywords: ["images", "stacks"], group: "Data", icon: Grid3x3, description: "Images and volumes" },
  // One page per array-dataset spec, from the same catalogue as the pages.
  ...ADATASET_SPECS.map<NavLinkDecl>((spec) => ({
    label: spec.label,
    route: arrayDatasetSpecLink(spec.slug),
    keywords: ["array datasets", "spec", spec.slug],
    group: "By kind",
    icon: spec.icon,
  })),
  { label: "Coordinate Systems", route: "/mikro/coordinatesystems", group: "Data", icon: Axis3d, description: "Frames and transforms" },
  { label: "Table Datasets", route: "/mikro/tabledatasets", keywords: ["tables"], group: "Data", icon: Table2, description: "Measurements as tables" },
  { label: "Sparse Datasets", route: "/mikro/sparsedatasets", keywords: ["matrices", "sparse", "csr", "anndata"], group: "Data", icon: Grid2x2, description: "Sparse matrices" },
  { label: "Lenses", route: "/mikro/lenses", keywords: ["slices", "crops", "views"], group: "Data", icon: ScanSearch, description: "Selections over array datasets" },
  { label: "Annotations", route: "/mikro/annotations", keywords: ["rois", "labels"], group: "Data", icon: PenTool, description: "ROIs and labels" },
  { label: "Folders", route: "/mikro/folders", group: "Files", icon: Folder, description: "How data is organized" },
  { label: "Files", route: "/mikro/files", group: "Files", icon: File, description: "Uploaded raw files" },
  { label: "Scenes", route: "/mikro/scenes", keywords: ["3d", "viewer"], group: "Data", icon: Clapperboard, description: "Composed viewer scenes" },
  { label: "Charts", route: "/mikro/charts", keywords: ["plots", "traces", "series", "curves"], group: "Data", icon: ChartSpline, description: "Data laid out along one axis" },
];
