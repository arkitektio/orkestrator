import type { SectionPins, SmartSectionId } from "@/core/smart/extensions/section";
import { useSmartPins } from "@/core/smart/extensions/pins";
import { ShortcutPinFragment, ShortcutPinFragmentDoc } from "@/rekuest/api/graphql";
import { useRekuest } from "@/rekuest/api/hooks";

/**
 * The Shortcuts section's pins: what an admin pinned for the user in this app
 * (`Shortcut.pinned`, a `ShortcutBinding` on the server), locked, ahead of
 * what the user pinned themselves (the host's store, still theirs to toggle).
 */
export const mergeShortcutPins = (
  own: SectionPins,
  bound: (itemKey: string) => boolean,
): SectionPins => ({
  isPinned: (itemKey) => bound(itemKey) || own.isPinned(itemKey),
  isLocked: (itemKey) => bound(itemKey),
  toggle: (itemKey) => {
    if (!bound(itemKey)) own.toggle(itemKey);
  },
  // Bound rows keep the server's order (it lists them first); the user's own follow.
  order: (itemKey) => (bound(itemKey) ? -1 : (own.order?.(itemKey) ?? Number.MAX_SAFE_INTEGER)),
});

/**
 * Reads each row's own `pinned` out of the cache the section's query filled,
 * so a bound shortcut paints pinned with its row and costs no query. Not
 * memoized on purpose: the answer changes with the cache, and the section
 * renders it in the same pass as its rows.
 */
export const useShortcutPins = (sectionId: SmartSectionId): SectionPins => {
  const own = useSmartPins(sectionId);
  const client = useRekuest();
  const bound = (itemKey: string) =>
    client.cache.readFragment<ShortcutPinFragment>({
      id: client.cache.identify({ __typename: "Shortcut", id: itemKey }),
      fragment: ShortcutPinFragmentDoc,
    })?.pinned === true;
  return mergeShortcutPins(own, bound);
};
