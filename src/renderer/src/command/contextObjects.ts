import { Identifier, Structure } from "@/types";
import { Modifier, selectSmarts } from "./ExtensionContext";

/**
 * The objects the palette's action sources run against.
 *
 * Smart modifiers (a search result made context with ⇧) are an explicit choice
 * and win over the page's own objects. Action demands are built from ONE
 * identifier, so only the modifiers sharing the most recently added one's
 * identifier are used — mixing kinds would ask for a list the backend can't match.
 */
export const resolveContextObjects = (
  modifiers: Modifier[],
  pageObjects: Structure[],
): Structure[] => {
  const smarts = selectSmarts(modifiers);
  if (smarts.length === 0) return pageObjects;

  const identifier = smarts[smarts.length - 1].identifier;
  return smarts
    .filter((modifier) => modifier.identifier === identifier)
    .map((modifier) => ({
      identifier: modifier.identifier as Identifier,
      object: { id: modifier.id },
    }));
};
