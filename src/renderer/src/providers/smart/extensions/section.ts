import type { FilterParts } from "@/command/filter";
import type { ServiceGuardProps } from "@/lib/arkitekt";
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

export type SmartSectionModule =
  | "local"
  | "alpaka"
  | "rekuest"
  | "kraph"
  | "kabinet";

/** `"<module>.<name>"`, e.g. `"rekuest.actions"`. */
export type SmartSectionId = `${SmartSectionModule}.${string}`;

/** A whole module (`"kraph"` matches every `kraph.*`) or one section id. */
export type SmartSectionSelector = SmartSectionModule | SmartSectionId;

/** What a caller may say about which sections it wants. */
export type SmartSectionSelection = {
  only?: readonly SmartSectionSelector[];
  exclude?: readonly SmartSectionSelector[];
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
};
