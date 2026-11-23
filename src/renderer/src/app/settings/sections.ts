import {
  Activity,
  Bug,
  Cpu,
  Download,
  FlaskConical,
  Keyboard,
  Mic,
  Network,
  Pin,
  Radio,
  RotateCcw,
  Server,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";

import type { RoleRequirement } from "@/core/connection/roles";

/**
 * The settings, as sections: one route each, grouped in the left column.
 *
 * Data rather than JSX so the router, the navigation and the page headers all
 * read the same list — a section cannot exist in one and be missing from
 * another. Order here is display order.
 */
export type SettingsGroupKey = "you" | "interface" | "network" | "computer" | "advanced";

export type SettingsSection = {
  /** Path segment under `/settings`. */
  slug: string;
  label: string;
  /** One line under the page title. */
  description: string;
  icon: LucideIcon;
  group: SettingsGroupKey;
  /** Only for users with these roles: missing from the nav, "not permitted" by link. */
  roles?: RoleRequirement;
};

/**
 * Who it is about, then how the app looks and is driven, how it reaches the hub, this computer,
 * and last what is only for trying things out or looking under the hood.
 */
export const SETTINGS_GROUPS: { key: SettingsGroupKey; title: string }[] = [
  { key: "you", title: "You" },
  { key: "interface", title: "Interface" },
  { key: "network", title: "Network" },
  { key: "computer", title: "This computer" },
  { key: "advanced", title: "Advanced" },
];

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    slug: "account",
    label: "Account",
    description: "Who you are signed in as, and how to leave.",
    icon: User,
    group: "you",
  },
  {
    slug: "appearance",
    label: "Appearance",
    description: "Colour mode, brand colours, page zoom, menus and the sidebar's glass and backdrop.",
    icon: Sparkles,
    group: "interface",
  },
  {
    slug: "shortcuts",
    label: "Keyboard shortcuts",
    description: "Every shortcut in the app, and the ones you can change.",
    icon: Keyboard,
    group: "interface",
  },
  {
    slug: "palette",
    label: "Command palette",
    description: "Which actions sit pinned at the top of ⌘K.",
    icon: Pin,
    group: "interface",
  },
  {
    slug: "voice",
    label: "Voice input",
    description: "Dictate into the palette and text fields.",
    icon: Mic,
    group: "interface",
  },
  {
    slug: "connection",
    label: "Connection",
    description: "Whether this window's live connections are up: the agent, and live task and state updates.",
    icon: Activity,
    group: "network",
  },
  {
    slug: "hub",
    label: "Hub",
    description: "The hub this app is connected to, the services it grants, and how this computer reaches each one.",
    icon: Server,
    group: "network",
  },
  {
    slug: "mesh",
    label: "Mesh",
    description: "The private network of the organisation you are signed in to.",
    icon: Network,
    group: "network",
  },
  {
    slug: "renderer",
    label: "Renderer",
    description: "How much memory 3D scenes may use on this computer.",
    icon: Cpu,
    group: "computer",
  },
  {
    slug: "updates",
    label: "Updates",
    description: "Which version of Orkestrator runs here, and getting the next one.",
    icon: Download,
    group: "computer",
  },
  {
    slug: "telemetry",
    label: "Telemetry",
    description: "What Orkestrator learns about this computer, and what a bug report says about it.",
    icon: Radio,
    group: "computer",
  },
  {
    slug: "reset",
    label: "Factory reset",
    description: "Erase everything Orkestrator stored on this computer.",
    icon: RotateCcw,
    group: "computer",
  },
  {
    slug: "experiments",
    label: "Experiments",
    description: "Recent features, on by default: switch one off if it gets in the way.",
    icon: FlaskConical,
    group: "advanced",
  },
  {
    slug: "developer",
    label: "Developer",
    description: "DevTools, debug mode, previewing other roles and performance reports.",
    icon: Bug,
    group: "advanced",
  },
];

/** Slugs sections had before, and where they are now: old links still land. */
export const MOVED_SECTIONS: Record<string, string> = {
  general: "experiments",
  services: "hub",
};

/** Where `/settings` lands. */
export const DEFAULT_SECTION = "appearance";

export const settingsLink = (slug: string) => `/settings/${slug}`;

export const sectionBySlug = (slug: string) =>
  SETTINGS_SECTIONS.find((section) => section.slug === slug);
