import {
  Bug,
  Mic,
  Network,
  Pin,
  Server,
  SlidersHorizontal,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";

/**
 * The settings, as sections: one route each, grouped in the left column.
 *
 * Data rather than JSX so the router, the navigation and the page headers all
 * read the same list — a section cannot exist in one and be missing from
 * another. Order here is display order.
 */
export type SettingsGroupKey = "you" | "app" | "system";

export type SettingsSection = {
  /** Path segment under `/settings`. */
  slug: string;
  label: string;
  /** One line under the page title. */
  description: string;
  icon: LucideIcon;
  group: SettingsGroupKey;
};

export const SETTINGS_GROUPS: { key: SettingsGroupKey; title: string }[] = [
  { key: "you", title: "You" },
  { key: "app", title: "Application" },
  { key: "system", title: "System" },
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
    slug: "general",
    label: "General",
    description: "Everyday behaviour: previews, zoom and experiments.",
    icon: SlidersHorizontal,
    group: "app",
  },
  {
    slug: "appearance",
    label: "Appearance",
    description: "Colour mode, brand colours and the sidebar's glass.",
    icon: Sparkles,
    group: "app",
  },
  {
    slug: "voice",
    label: "Voice input",
    description: "Dictate into the palette and text fields.",
    icon: Mic,
    group: "app",
  },
  {
    slug: "palette",
    label: "Command palette",
    description: "Which actions sit pinned at the top of ⌘K.",
    icon: Pin,
    group: "app",
  },
  {
    slug: "services",
    label: "Services",
    description: "What this deployment provides, and whether it is reachable.",
    icon: Server,
    group: "system",
  },
  {
    slug: "mesh",
    label: "Mesh",
    description: "The private network of the organisation you are signed in to.",
    icon: Network,
    group: "system",
  },
  {
    slug: "developer",
    label: "Updates & developer",
    description: "Application updates, DevTools and debug mode.",
    icon: Bug,
    group: "system",
  },
];

/** Where `/settings` lands. */
export const DEFAULT_SECTION = "general";

export const settingsLink = (slug: string) => `/settings/${slug}`;

export const sectionBySlug = (slug: string) =>
  SETTINGS_SECTIONS.find((section) => section.slug === slug);
