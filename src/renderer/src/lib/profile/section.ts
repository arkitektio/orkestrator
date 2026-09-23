import type { ServiceGuardProps } from "@/lib/arkitekt";
import type React from "react";

/** Whose profile is showing. `sub` is the lok user id, which IS the subject. */
export type ProfileContext = {
  sub: string;
  isMe: boolean;
};

/** `"<module>.<name>"`, e.g. `"mikro.latest-images"`. */
export type ProfileSectionId = `${string}.${string}`;

/**
 * One module's contribution to a member's profile — "latest images by this
 * user", "their agents", ….
 *
 * Unlike a smart context section this is a whole component, not a query plus a
 * row: profile sections differ in shape (a thumbnail grid, a row list), and
 * none of them needs the menu's search narrowing or status reporting.
 */
export type ProfileSection = {
  id: ProfileSectionId;
  module: string;
  /** Heading, drawn by `ProfileSectionFrame`. */
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Ascending; ties break on id. */
  priority: number;
  /**
   * The module guard (`Guard.Mikro`, …). Applied OUTSIDE `Component`, so its
   * query never mounts while the backend is not ready (CLAUDE.md §1).
   */
  Guard: React.ComponentType<ServiceGuardProps>;
  /** Cheap, synchronous, hook-free. False = the section never mounts. */
  applies?: (ctx: ProfileContext) => boolean;
  /**
   * Owns its query. Renders `null` while it has nothing to show, and wraps what
   * it does show in `ProfileSectionFrame` — no empty panels.
   */
  Component: React.ComponentType<ProfileContext>;
};

export type ProfileSectionRegistry = {
  /** Sorted once by (priority, id). */
  sections: readonly ProfileSection[];
};

export const createProfileSectionRegistry = (
  sections: readonly ProfileSection[],
): ProfileSectionRegistry => {
  const seen = new Set<ProfileSectionId>();
  for (const section of sections) {
    if (seen.has(section.id)) {
      throw new Error(`Duplicate profile section id: ${section.id}`);
    }
    seen.add(section.id);
  }
  return {
    sections: [...sections].sort(
      (a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    ),
  };
};

/** The sections that apply to this profile, in order. */
export const resolveProfileSections = (
  registry: ProfileSectionRegistry,
  ctx: ProfileContext,
): ProfileSection[] =>
  registry.sections.filter((section) => section.applies?.(ctx) ?? true);
