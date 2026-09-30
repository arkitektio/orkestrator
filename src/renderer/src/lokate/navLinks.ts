import { ShieldCheck } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/** lokate's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const LOKATE_NAV_LINKS: NavLinkDecl[] = [
  {
    label: "Privacy",
    route: "/lokate/privacy",
    keywords: ["location", "retention", "access log", "delete", "gps"],
    group: "Settings",
    icon: ShieldCheck,
    description: "Retention, reads and deletion",
    home: true,
  },
];
