import { PreferredView } from "@/mikro/api/graphql";
import type { DisplayMode } from "../stores/modeStore";
import { getLayerZSize } from "../coords/worldTransform";
import type { LayerState } from "../model/layerModel";

/**
 * `Scene.preferredView` → the display mode the viewer opens in.
 *
 * A preference, not a constraint: nothing server-side reads it, the viewer
 * stays free to overrule it, and the user can switch the moment the scene is
 * up. It decides the FIRST frame only.
 */

/** True when any layer has real depth — the fact AUTO would key off. */
export const sceneHasVolumetricDepth = (layers: readonly LayerState[]): boolean =>
  layers.some((layer) => (getLayerZSize(layer) ?? 0) > 1);

/**
 * AUTO deliberately resolves to 2D, not to "3D if the data has depth".
 *
 * AUTO is the server's default, so it is what every scene predating this field
 * reports — resolving it by depth would silently flip existing volumetric
 * scenes to opening in 3D, a change nobody asked for by not setting a
 * preference. The schema is explicit that AUTO means "no preference stated …
 * a scene nobody has expressed a preference for should not claim one", so the
 * viewer's own long-standing default (2D, the cheaper view) is the honest
 * reading. A scene that wants to open volumetric says THREE_D.
 *
 * `layers` is taken (unused for AUTO today) so the signature does not change
 * if that policy is ever revisited — `sceneHasVolumetricDepth` is the fact it
 * would key off.
 */
export const resolvePreferredDisplayMode = (
  preferredView: PreferredView | null | undefined,
  _layers: readonly LayerState[] = [],
): DisplayMode => {
  switch (preferredView) {
    case PreferredView.ThreeD:
      return "3D";
    case PreferredView.TwoD:
    case PreferredView.Auto:
    default:
      return "2D";
  }
};

/** The display mode as a `PreferredView` — what the save path writes back. */
export const displayModeToPreferredView = (mode: DisplayMode): PreferredView =>
  mode === "3D" ? PreferredView.ThreeD : PreferredView.TwoD;
