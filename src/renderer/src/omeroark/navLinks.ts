import { FolderKanban, Home, Image } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/** omeroark's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const OMEROARK_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/omeroark", group: "Data", icon: Home, home: true },
  { label: "Datasets", route: "/omeroark/datasets", group: "Data", icon: Image, description: "OMERO datasets" },
  { label: "Projects", route: "/omeroark/projects", group: "Data", icon: FolderKanban, description: "OMERO projects" },
];
