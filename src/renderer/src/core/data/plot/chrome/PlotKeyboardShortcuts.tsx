import { useEffect, useRef } from "react";
import { isTypingTarget } from "@/core/dnd/keyboardTarget";
import { panBy, useRangeStoreApi } from "../stores/rangeStore";
import { useViewerStoreApi, type InteractionMode } from "../stores/viewerStore";

/**
 * The plot's keys — the scene's bindings where the meaning is the same:
 *
 *  - hold **A** — annotate while held; release restores whatever mode was active
 *    (mikro's hold-to-mode, including its two edge cases: a toolbar click during
 *    the hold wins over the restore, and alt-tabbing mid-hold — which never fires
 *    keyup — restores on blur rather than stranding the viewer in ANNOTATE);
 *  - **Esc** — back to explore (unless the annotate drawer consumed it to cancel
 *    a shape in progress);
 *  - in ANNOTATE, the tool keys (the module's tool table) and Enter / Esc are the
 *    drawer's own;
 *  - **F** — fit the whole timeline;
 *  - **← / →** — pan by a tenth of the window;
 *  - **⌘/Ctrl-Z**, **⇧⌘/Ctrl-Z** — step the zoom history (box zooms are in it).
 */
const PAN_FRACTION = 0.1;

export const PlotKeyboardShortcuts = ({
  annotatable,
}: {
  /** Whether hold-A may enter ANNOTATE: read when the key goes down. */
  annotatable: () => boolean;
}) => {
  const rangeApi = useRangeStoreApi();
  const viewerApi = useViewerStoreApi();
  const annotatableRef = useRef(annotatable);
  annotatableRef.current = annotatable;

  useEffect(() => {
    let held: { key: string; restore: InteractionMode } | null = null;

    const releaseHold = () => {
      if (!held) return;
      const { restore } = held;
      held = null;
      if (viewerApi.getState().interactionMode === "ANNOTATE") {
        viewerApi.getState().setInteractionMode(restore);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target as HTMLElement | null)) return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) rangeApi.getState().redo();
        else rangeApi.getState().undo();
        return;
      }
      // Cmd+A must not flip the viewer into a tool mode.
      if (mod || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === "a" && !event.repeat && !held && annotatableRef.current()) {
        held = { key, restore: viewerApi.getState().interactionMode };
        viewerApi.getState().setInteractionMode("ANNOTATE");
        return;
      }
      if (key === "f") rangeApi.getState().fit();
      // A consumed Esc (the annotate drawer cancelling a shape) is not "back to explore".
      if (event.key === "Escape" && !event.defaultPrevented) {
        viewerApi.getState().setInteractionMode("EXPLORE");
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const { liveRange } = rangeApi.getState();
        const delta = (liveRange.end - liveRange.start) * PAN_FRACTION;
        rangeApi
          .getState()
          .setLiveRange(panBy(liveRange, event.key === "ArrowLeft" ? -delta : delta));
      }
    };

    // Keyed off the armed hold, not the event target: focus can move mid-hold.
    const onKeyUp = (event: KeyboardEvent) => {
      if (held && event.key.toLowerCase() === held.key) releaseHold();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseHold);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseHold);
    };
  }, [rangeApi, viewerApi]);

  return null;
};
