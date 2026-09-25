import type { SerializedDockview } from "dockview";

/**
 * Is there anything in this saved layout to restore?
 *
 * A serialized dockview with no panels is indistinguishable from one captured
 * off a grid that was being torn down, and the dashboard persists on every
 * layout change — including the ones a disposal emits. Restoring such a layout
 * produces an empty dashboard that then saves itself again, so the blank
 * sticks. Treating it as "nothing saved" falls back to the default panels and
 * heals the stored entry on the next save.
 */
export const hasRestorablePanels = (
  layout: SerializedDockview | null | undefined,
): boolean => Object.keys(layout?.panels ?? {}).length > 0;

/**
 * Which widgets still need a panel.
 *
 * `alreadyAdded` is the dashboard's own bookkeeping (it remembers panels the
 * user deliberately closed, which must not come back), `existingPanelIds` is
 * what the live grid actually holds. A key in either one is skipped: adding a
 * panel whose id is already taken throws, and a throw inside an effect takes
 * the whole page down.
 */
export const widgetKeysToAdd = (
  widgetKeys: readonly string[],
  alreadyAdded: ReadonlySet<string>,
  existingPanelIds: readonly string[],
): string[] => {
  const existing = new Set(existingPanelIds);
  return widgetKeys.filter(
    (key) => !alreadyAdded.has(key) && !existing.has(key),
  );
};
