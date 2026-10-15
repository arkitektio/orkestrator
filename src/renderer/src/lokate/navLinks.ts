import { ChartNoAxesCombined, Footprints, History, Home, MapPin, Route, ShieldCheck } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/** lokate's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const LOKATE_NAV_LINKS: NavLinkDecl[] = [
  { label: "Home", route: "/lokate/home", keywords: ["location"], group: "Explore", icon: Home, home: true },
  {
    label: "Timeline",
    route: "/lokate",
    keywords: ["location", "history", "day", "where", "gps", "map"],
    group: "Explore",
    icon: History,
    description: "Your day, stay by stay",
  },
  {
    label: "Places",
    route: "/lokate/places",
    keywords: ["location", "named", "home", "work", "map"],
    group: "Explore",
    icon: MapPin,
    description: "Your named places",
  },
  {
    label: "Visits",
    route: "/lokate/visits",
    keywords: ["location", "stays", "history"],
    group: "Explore",
    icon: Footprints,
    description: "Every stay, newest first",
  },
  {
    label: "Trips",
    route: "/lokate/trips",
    keywords: ["location", "travel", "movement"],
    group: "Explore",
    icon: Route,
    description: "Every movement between stays",
  },
  {
    label: "Insights",
    route: "/lokate/insights",
    keywords: ["location", "stats", "distance", "travelled", "time spent"],
    group: "Explore",
    icon: ChartNoAxesCombined,
    description: "Distance and time per place",
  },
  {
    label: "Privacy",
    route: "/lokate/privacy",
    keywords: ["location", "phones", "devices", "delete", "gps"],
    group: "Settings",
    icon: ShieldCheck,
    description: "Phones and deletion",
  },
];
