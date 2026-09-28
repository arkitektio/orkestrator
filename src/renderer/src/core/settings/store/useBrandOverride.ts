import { useEffect } from "react";
import { useSettings } from "./SettingsContext";
import {
  getEffectiveBrand,
  setBrandOverride,
  type BrandTarget,
} from "./brandTheme";
import { defaultSettings } from "./validator";

/** Only reachable if the user cleared their brand hue AND the stylesheet's own
 * value is unreadable — an achromatic target needs *some* hue to sit at. */
const DEFAULT_BRAND_HUE = defaultSettings.brandHue ?? 267.256;

/** Matches the `--brand-hue` transition duration in `index.css`. The class is
 * held this long after the override is released so the ease BACK to the user's
 * brand color plays out before the transition is switched off again. */
const TRANSITION_MS = 800;
const TRANSITION_CLASS = "brand-animating";

/** Both of these are per-document, not per-component: a scene teardown and the
 * next scene's mount overlap, and the outgoing one must neither strip the class
 * from under the incoming animation nor lose track of where the hue currently
 * sits. */
let pendingRelease: ReturnType<typeof setTimeout> | null = null;
let lastAppliedHue: number | null = null;

const beginAnimating = () => {
  if (pendingRelease !== null) {
    clearTimeout(pendingRelease);
    pendingRelease = null;
  }
  document.documentElement.classList.add(TRANSITION_CLASS);
};

const endAnimating = () => {
  if (pendingRelease !== null) {
    clearTimeout(pendingRelease);
  }
  pendingRelease = setTimeout(() => {
    pendingRelease = null;
    document.documentElement.classList.remove(TRANSITION_CLASS);
  }, TRANSITION_MS + 50);
};

const release = () => {
  lastAppliedHue = null;
  setBrandOverride(null);
};

/**
 * Take the hue on the shortest way round the circle.
 *
 * `--brand-hue` is a registered `<number>`, so the browser interpolates it
 * numerically: 350 → 10 would sweep backwards through 340°, every intermediate
 * color in tow. Writing 370 instead transitions +20° and renders identically,
 * since `oklch()` reads hue modulo 360. The value stays unwrapped from then on,
 * which is exactly what the next change needs to measure its own delta against.
 */
export const unwrapHue = (from: number, to: number) =>
  from + (((((to - from) % 360) + 540) % 360) - 180);

/**
 * Tint the whole app to `target` for as long as the calling component is
 * mounted, easing in and easing back out on unmount.
 *
 * Pass null when there is nothing to tint to at all (no layer) — the user's own
 * brand color is then left alone. A target with a null HUE is different: it
 * still applies its chroma, so a grey colormap desaturates the app rather than
 * being ignored. Honours the `sceneThemeSync` setting; with it off the hook is
 * inert.
 */
export const useBrandOverride = (target: BrandTarget | null) => {
  const { settings } = useSettings();
  const enabled = settings.sceneThemeSync !== false;

  const hue = target?.hue ?? null;
  const chroma = target?.chroma ?? null;

  // Applying the target and owning the override are separate effects on
  // purpose. A single effect's cleanup would fire on every target change and
  // release the override just to re-take it, which loses the hue the animation
  // is actually at — the one thing the shortest-arc unwrap needs to measure
  // against.
  useEffect(() => {
    if (!enabled || chroma === null) {
      release();
      return;
    }

    const from = lastAppliedHue ?? getEffectiveBrand().hue;
    // A null hue keeps whatever is applied — see `BrandTarget`. There is always
    // something to keep: the base hue, which the stylesheet guarantees.
    const applied =
      hue === null
        ? (from ?? DEFAULT_BRAND_HUE)
        : from === undefined
          ? hue
          : unwrapHue(from, hue);

    beginAnimating();
    setBrandOverride({ hue: applied, chroma });
    lastAppliedHue = applied;
  }, [enabled, hue, chroma]);

  useEffect(
    () => () => {
      release();
      endAnimating();
    },
    [],
  );
};
