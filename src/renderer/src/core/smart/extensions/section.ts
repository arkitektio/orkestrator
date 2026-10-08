import type { RoleRequirement } from "@/core/connection/roles";
import type { FilterParts } from "@/core/command/filter";
import type { ServiceGuardProps } from "@/core/connection/arkitekt";
import type { DocumentNode } from "@apollo/client";
import type React from "react";
import type { SmartContextProps } from "./types";

/**
 * One section of the smart context menu ("Run", "Shortcuts", "Relate", …).
 *
 * The menu used to be a hardcoded list of components, each wrapped in its
 * module guard and gated by a `disableX` prop. It is now a registry of these
 * descriptors: every module exports its own, `app/smartcontext.tsx` merges
 * them (the way `app/localactions.tsx` merges local actions), and
 * `SmartContext` iterates the merged list in priority order. Adding a section
 * is adding a descriptor; nothing in `context.tsx` changes.
 */

/** The contributing module's namespace (`"rekuest"`), or `"local"` for the host's own. */
export type SmartSectionModule = string;

/** `"<module>.<name>"`, e.g. `"rekuest.actions"`. */
export type SmartSectionId = `${string}.${string}`;

/** A whole module (`"kraph"` matches every `kraph.*`) or one section id. */
export type SmartSectionSelector = SmartSectionModule | SmartSectionId;

/** What a caller may say about which sections it wants. */
export type SmartSectionSelection = {
  only?: readonly SmartSectionSelector[];
  exclude?: readonly SmartSectionSelector[];
  /** Only the sections that offer themselves to the command palette. */
  palette?: boolean;
};

/** Local actions are computed synchronously; everything else asks a server. */
export type SmartSectionTier = "instant" | "remote";

/**
 * What every section is handed: the caller's props plus the search text —
 * `filter` is the debounced value the queries run with, `liveFilter` the raw
 * input, for narrowing the rows already on screen while the server answers.
 */
export type SmartSectionContext = SmartContextProps & {
  filter?: string;
  liveFilter?: string;
  /** The surface draws the sections' `SearchBar`s (the menu does, the palette does not). */
  hasSearchBar?: boolean;
};

/**
 * - `loading`: no rows for these variables yet.
 * - `revalidating`: rows from the previous variables are shown while the new
 *   ones are fetched.
 * - `ready`: rows for these variables are here (a `cache-and-network`
 *   background refetch that already has rows is `ready`, not pending).
 */
export type SectionStatus = "loading" | "revalidating" | "ready" | "error";

export type SectionItems<T> = {
  items: readonly T[] | undefined;
  status: SectionStatus;
  error?: unknown;
};

/**
 * A section's pins, by item key. The host keeps them for every section
 * (`pins.ts`); a section whose rows already have a pin store of their own
 * (local actions) answers with that one through `usePins`.
 */
export type SectionPins = {
  isPinned: (itemKey: string) => boolean;
  toggle: (itemKey: string) => void;
  /** Pinned by declaration; the user cannot unpin it. */
  isLocked?: (itemKey: string) => boolean;
  /** Position among the pinned rows, ascending. Omit to keep the row order. */
  order?: (itemKey: string) => number;
};

export type SmartContextSection<T = unknown> = {
  id: SmartSectionId;
  module: SmartSectionModule;
  /** Group heading. */
  title: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  /** Ascending; ties break on id. Decides DOM order, whatever lands first. */
  priority: number;
  tier: SmartSectionTier;
  /**
   * The module guard (`Guard.Rekuest`, …). Applied OUTSIDE `useItems`, so the
   * query never mounts while the backend is not ready (CLAUDE.md §1).
   */
  Guard?: React.ComponentType<ServiceGuardProps>;
  /** Only for users with these roles; checked with the guard, outside `useItems`. */
  roles?: RoleRequirement;
  /** Cheap, synchronous, hook-free. False = the section never mounts at all. */
  applies: (props: SmartContextProps) => boolean;
  /** The leaf: query + shaping. One instance per mounted section. */
  useItems: (context: SmartSectionContext) => SectionItems<T>;
  itemKey: (item: T) => string;
  /**
   * Text to match `liveFilter` against, for instant narrowing of the rows on
   * screen while the debounced server search is in flight. Omit to skip.
   */
  searchParts?: (item: T) => FilterParts;
  Row: React.ComponentType<{ item: T; context: SmartSectionContext }>;
  /**
   * Buttons for the right end of the menu's search field: what is worth one
   * click on every open. Mounted inside the section's guard, like its rows.
   */
  SearchBar?: React.ComponentType<{ context: SmartSectionContext }>;
  /** Its own pin store, instead of the host's. A hook: one per mounted section. */
  usePins?: (sectionId: SmartSectionId) => SectionPins;
  /** Also offered in the ⌘K palette (under its own search), not only in the menu. */
  palette?: boolean;
  /**
   * Queries worth warming before the menu opens (hover, selection change),
   * as data: the host owns the TTL, dedupe and which client answers. Build the
   * variables with the SAME builders `useItems` uses, or the warmed cache
   * entry is never hit.
   */
  prefetch?: (target: SmartPrefetchTarget) => readonly SmartPrefetchQuery[];
};

export type SmartPrefetchTarget = Pick<SmartContextProps, "objects" | "partners" | "returns" | "collection">;

export type SmartPrefetchQuery = {
  /** The service key whose client runs it (`"rekuest"`). */
  service: string;
  /** Part of the dedupe key, e.g. `"actions"`. */
  name: string;
  query: DocumentNode;
  variables: Record<string, unknown>;
};

/**
 * Wraps the whole menu (and the palette), OUTSIDE its `<Command>`: for
 * machinery a row cannot host itself, such as rekuest's single "Run on"
 * submenu (cmdk would swallow Enter inside the list). Must always render its
 * children.
 */
export type SmartMenuWrapperProps = {
  context: SmartContextProps;
  returnFocusTo?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
};
