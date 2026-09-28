/**
 * Which layer slot a Shift+digit chord addresses: Shift+1 is the first channel
 * in the Layers list, Shift+9 the ninth, and Shift+0 the tenth — the same
 * "0 closes the run of digits" convention browser tabs and layer palettes use.
 * Beyond ten there are no keys left, so those channels stay mouse-only.
 *
 * Keyed on `KeyboardEvent.code`, never `key`: with Shift down, the digit row
 * reports whatever the layout prints on it — "!" on a US keyboard, "1" on a
 * German one — while `code` stays `Digit1` on both. Matching on `key` would
 * bind the shortcut to a keyboard layout.
 *
 * Returns null for anything that is not a digit, so the caller can bail before
 * touching the store.
 */
export const layerSlotForCode = (code: string): number | null => {
  const match = /^Digit([0-9])$/.exec(code);
  if (!match) return null;
  const digit = Number(match[1]);
  // 1..9 count from zero; 0 is the tenth slot, not the first.
  return digit === 0 ? 9 : digit - 1;
};

/**
 * The flag to write to flip a layer. `visible` is optional and a freshly
 * normalized layer leaves it true, so "not explicitly false" means shown —
 * the same reading `LayerRow`'s eye button uses.
 */
export const toggledVisibility = (visible: boolean | undefined): boolean =>
  visible === false;
