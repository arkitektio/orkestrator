import type {
  SmartContextSection,
  SmartSectionId,
  SmartSectionSelector,
} from "./section";
import type { SmartContextProps } from "./types";

export type SmartSectionRegistry = {
  /** Sorted once by (priority, id). */
  sections: readonly SmartContextSection<any>[];
};

export const createSmartSectionRegistry = (
  sections: readonly SmartContextSection<any>[],
): SmartSectionRegistry => {
  const seen = new Set<SmartSectionId>();
  for (const section of sections) {
    if (seen.has(section.id)) {
      throw new Error(`Duplicate smart context section id: ${section.id}`);
    }
    seen.add(section.id);
  }
  return {
    sections: [...sections].sort(
      (a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    ),
  };
};

/** `"kraph"` matches every `kraph.*`; a full id matches itself only. */
export const matchesSelector = (
  id: SmartSectionId,
  selector: SmartSectionSelector,
): boolean => selector === id || id.startsWith(`${selector}.`);

/**
 * The sections this menu shows, in order: the caller's `only` / `exclude`
 * first, then each section's own `applies` (so a batch section is not even
 * mounted for a single object — no query, no status entry).
 */
export const resolveSections = (
  registry: SmartSectionRegistry,
  props: SmartContextProps,
): SmartContextSection<any>[] => {
  const only = props.sections?.only;
  const exclude = props.sections?.exclude;
  return registry.sections.filter((section) => {
    if (only && !only.some((selector) => matchesSelector(section.id, selector))) {
      return false;
    }
    if (exclude?.some((selector) => matchesSelector(section.id, selector))) {
      return false;
    }
    if (props.sections?.palette && !section.palette) {
      return false;
    }
    return section.applies(props);
  });
};
