import { Structure } from "@/core/types";
import { smartRegistry } from "../registry";

/** "Image" → "Images". Good enough for model names; nobody registers an irregular one. */
const plural = (name: string) => {
  if (/[^aeiou]y$/i.test(name)) return `${name.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(name)) return `${name}es`;
  return `${name}s`;
};

/** How many kinds are named before the rest become "+2 more". */
const MAX_KINDS = 2;

/**
 * A handful of structures in words: "Image", "3 Images", "2 Images, 1 Dataset".
 * By the names the models were registered with, not their identifiers.
 */
export const describeStructures = (structures: Structure[]): string => {
  const counts = new Map<string, number>();
  for (const { identifier } of structures) {
    counts.set(identifier, (counts.get(identifier) ?? 0) + 1);
  }

  const kinds = [...counts].map(([identifier, count]) => {
    const name = smartRegistry.getDisplayName(identifier);
    // One thing of one kind needs no number; anything else does.
    if (structures.length === 1) return name;
    return `${count} ${count === 1 ? name : plural(name)}`;
  });

  const named = kinds.slice(0, MAX_KINDS).join(", ");
  const rest = kinds.length - MAX_KINDS;
  return rest > 0 ? `${named} +${rest} more` : named;
};
