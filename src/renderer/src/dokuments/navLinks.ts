import { File, FileText, Home } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/** dokuments' pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const DOKUMENTS_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/dokuments", group: "Documents", icon: Home, home: true },
  { label: "Documents", route: "/dokuments/documents", group: "Documents", icon: FileText, description: "Parsed documents" },
  { label: "Files", route: "/dokuments/files", keywords: ["uploads", "pdf"], group: "Documents", icon: File, description: "Uploaded files" },
];
