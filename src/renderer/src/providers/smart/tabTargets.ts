import { Structure } from "@/types";

import { smartRegistry } from "./registry";

/** Where a structure's page is, and what its tab is called. */
export type TabTarget = { to: string; label: string };

/**
 * One structure as a tab. `null` when nothing in the registry claims the
 * identifier — a drop can carry anything, including a structure from a window
 * connected to a deployment this one does not have the module for.
 *
 * The label is the object's own name where it has one, so a tab reads as the
 * thing rather than as its id; the display name and id are the floor.
 */
export const structureTabTarget = ({ identifier, id, label }: Structure): TabTarget | null => {
  const path = smartRegistry.buildModelPath(identifier, id);
  if (!path) {
    return null;
  }

  return {
    to: path.startsWith("/") ? path : `/${path}`,
    label: label || `${smartRegistry.getDisplayName(identifier)} ${id}`,
  };
};

/** The structures that have a page, as tabs; the rest are dropped. */
export const structureTabTargets = (structures: Structure[]): TabTarget[] =>
  structures
    .map(structureTabTarget)
    .filter((target): target is TabTarget => target !== null);
