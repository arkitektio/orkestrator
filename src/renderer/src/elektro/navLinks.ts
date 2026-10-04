import { Box, File, FlaskConical, Home, LayoutDashboard, LineChart, Network, Sprout, Zap } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";
import { ARRAY_DATASET_SPECS, arrayDatasetSpecLink } from "./specs";

/** elektro's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const ELEKTRO_NAV_LINKS: NavLinkDecl[] = [
  { label: "Home", route: "/elektro", group: "Neuron", icon: Home, home: true },
  { label: "Experiments", route: "/elektro/experiments", group: "Neuron", icon: FlaskConical, description: "Recorded experiments" },
  { label: "Neuron models", route: "/elektro/neuronmodels", group: "Neuron", icon: Network, description: "Morphologies and models" },
  { label: "Model Collections", route: "/elektro/modelcollections", group: "Neuron", icon: Box, description: "Grouped neuron models" },
  { label: "Workspaces", route: "/elektro/modelworkspaces", group: "Neuron", icon: LayoutDashboard, description: "Model editing workspaces" },
  { label: "Mechanisms", route: "/elektro/mechanisms", keywords: ["channels", "mod"], group: "Neuron", icon: Zap, description: "Channel mechanisms" },
  { label: "Environments", route: "/elektro/environments", keywords: ["mod", "mechanisms"], group: "Neuron", icon: Sprout, description: "Sets of mechanisms" },
  { label: "Datasets", route: "/elektro/arraydatasets", group: "Ephys", icon: LineChart, description: "Recorded traces" },
  { label: "Files", route: "/elektro/files", group: "Ephys", icon: File, description: "Uploaded raw files" },
  // One page per elektro array-dataset spec, from the same catalogue as the pages.
  ...ARRAY_DATASET_SPECS.map<NavLinkDecl>((spec) => ({
    label: spec.label,
    route: arrayDatasetSpecLink(spec.slug),
    keywords: ["datasets", "recordings", "spec", spec.slug],
    group: "By kind",
    icon: spec.icon,
  })),
];
