/**
 * The single writer of `--brand-hue` / `--brand-chroma` on `<html>`.
 *
 * Three independent sources want those variables:
 *   - the BASE, from user settings (ThemeCustomizer → settingsStore),
 *   - the REMOTE brand, from the caller's lok membership in the active
 *     organization (falling back to the organization's own default), and
 *   - an OVERRIDE, from whatever scene is currently open (its main layer's
 *     colormap tints the whole app).
 *
 * They must not write the inline style directly or the last writer wins by
 * accident — saving an unrelated setting mid-scene would snap the hue back, and
 * leaving a scene would wipe the user's chosen brand color. All three go
 * through here instead, and the effective value is
 * `override ?? remote ?? base`, resolved PER FIELD: a membership that sets only
 * a hue still takes its chroma from the layer below.
 */

export type Brand = {
  hue: number;
  chroma: number;
};

/**
 * What a source ASKS for, before it is resolved against the current hue.
 *
 * `hue: null` means "no opinion on hue" — an achromatic color (a grey colormap)
 * still sets a chroma, and at chroma ≈ 0 the hue is both invisible and
 * numerically meaningless, so the hue already in play is left where it is
 * rather than spun to a noise angle.
 */
export type BrandTarget = {
  hue: number | null;
  chroma: number;
};

/** Fallback when neither source has a value — the stylesheet's own cascade
 * (`:root` / `.dark`) takes over, so we remove the inline property. */
export type PartialBrand = {
  hue: number | undefined;
  chroma: number | undefined;
};

const EMPTY: PartialBrand = { hue: undefined, chroma: undefined };

let base: PartialBrand = EMPTY;
let remote: PartialBrand = EMPTY;
let override: Brand | null = null;

const writeProperty = (name: string, value: number | undefined) => {
  if (value === undefined) {
    document.documentElement.style.removeProperty(name);
    return;
  }
  document.documentElement.style.setProperty(name, value.toString());
};

const apply = () => {
  if (typeof document === "undefined") {
    return;
  }
  writeProperty("--brand-hue", override?.hue ?? remote.hue ?? base.hue);
  writeProperty("--brand-chroma", override?.chroma ?? remote.chroma ?? base.chroma);
};

/** The user's configured brand, from settings. `undefined` fields fall back to
 * the stylesheet (which is how a user who never touched the customizer gets the
 * `.dark` block's own hue). */
export const setBrandBase = (next: PartialBrand) => {
  base = next;
  apply();
};

/**
 * The brand carried by the caller's membership in the active organization,
 * already resolved against the organization's own default. Outranks the local
 * settings brand: it is the user's own choice too, just stored server-side, so
 * it should follow them onto whatever machine they sign in from. Pass an empty
 * brand (or call with both fields undefined) when lok is unavailable or has
 * nothing set — the local settings brand then takes over again.
 */
export const setBrandRemote = (next: PartialBrand) => {
  remote = next;
  apply();
};

/** A scene's tint, or `null` to hand control back to the layers below. */
export const setBrandOverride = (next: Brand | null) => {
  override = next;
  apply();
};

/** What is currently on screen. The hue may be UNWRAPPED (outside 0–360) —
 * callers keep it continuous so a 350° → 10° change transitions the short way
 * round rather than sweeping backwards through the whole circle. `oklch()`
 * treats hue as modulo-360, so an unwrapped value renders identically. */
export const getEffectiveBrand = (): PartialBrand => ({
  hue: override?.hue ?? remote.hue ?? base.hue,
  chroma: override?.chroma ?? remote.chroma ?? base.chroma,
});

/** Test seam — resets every source without touching the DOM state semantics. */
export const resetBrandTheme = () => {
  base = EMPTY;
  remote = EMPTY;
  override = null;
  apply();
};
