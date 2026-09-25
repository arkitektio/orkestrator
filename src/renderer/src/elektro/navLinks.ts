import type { NavLinkDecl } from "@/lib/module-host/define";
import { ARRAY_DATASET_SPECS, arrayDatasetSpecLink } from "./specs";

/**
 * elektro's pages, for the ⌘K palette (a `navLinks` builtin). Mirrors the
 * links its rail pane renders; `routeCatalog.test.ts` fails when they drift.
 */
export const ELEKTRO_NAV_LINKS: NavLinkDecl[] = [
  { label: "Home", route: "/elektro" },
  { label: "Experiments", route: "/elektro/experiments" },
  { label: "Neuron models", route: "/elektro/neuronmodels" },
  { label: "Model Collections", route: "/elektro/modelcollections" },
  { label: "Workspaces", route: "/elektro/modelworkspaces" },
  { label: "Datasets", route: "/elektro/arraydatasets" },
  { label: "Files", route: "/elektro/files" },
  // One page per elektro array-dataset spec, exactly as the pane lists them.
  ...ARRAY_DATASET_SPECS.map<NavLinkDecl>((spec) => ({
    label: spec.label,
    route: arrayDatasetSpecLink(spec.slug),
    keywords: ["datasets", "recordings", "spec", spec.slug],
  })),
];
