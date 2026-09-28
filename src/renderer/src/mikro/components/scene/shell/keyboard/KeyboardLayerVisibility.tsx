import { useEffect } from "react";
import { useSceneStoreApi } from "../../platform/stores/sceneStore";
import { isTypingTarget } from "../../platform/input/keyboardTarget";
import { layerSlotForCode, toggledVisibility } from "./layerVisibilityKeys";

/**
 * Shift+1…Shift+0 toggle a channel's visibility by its position in the Layers
 * list — the fastest way to answer "is that signal coming from this channel?",
 * which otherwise costs a trip to the sidebar and back for every comparison.
 *
 * The write is exactly what the eye button in `LayerRow` does (`updateLayer`
 * with a flipped `visible`), so the two stay in sync by construction and the
 * toggle is scene-local, not persisted.
 *
 * Reads the layers through the store API rather than subscribing to them: this
 * listener wants whatever the list holds at keypress time, and subscribing
 * would tear down and re-register the window handler on every layer edit —
 * including the ones it makes itself.
 */
export const KeyboardLayerVisibility = () => {
  const sceneApi = useSceneStoreApi();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift alone. Cmd/Ctrl+Shift+digit are browser and OS bindings, and
      // holding the digit down should not strobe the channel.
      if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (isTypingTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) {
        return;
      }

      const slot = layerSlotForCode(e.code);
      if (slot === null) return;

      const { layers, updateLayer } = sceneApi.getState();
      const layer = layers[slot];
      // A chord past the end of the list is not an error — the scene simply has
      // fewer channels than the digit row has keys.
      if (!layer) return;

      e.preventDefault();
      updateLayer({ ...layer, visible: toggledVisibility(layer.visible) });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sceneApi]);

  return null; // Headless: this is a binding, not a control.
};
