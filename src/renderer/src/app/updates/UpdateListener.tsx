import { useEffect } from "react";
import {
  updateAvailable,
  updateChecking,
  updateDownloaded,
  updateError,
  updateNone,
  updateProgress,
} from "../../core/updates/updateStore";

/**
 * The one subscription to the updater's events, feeding `updateStore`.
 *
 * Renders nothing. Mounted once, high and outside every Guard: an update is an
 * app concern, not a service's, and it must be heard whether or not anyone is
 * looking at the settings page — which is where the only listener used to live.
 *
 * `window.updates` exists only in the packaged/contextIsolated renderer, so in a
 * web build this is inert and the store stays `idle` (every reader then renders
 * nothing).
 */
export const UpdateListener = () => {
  useEffect(() => {
    if (!window.updates) return undefined;

    const disposers = [
      window.updates.onStatus(updateChecking),
      window.updates.onAvailable(updateAvailable),
      window.updates.onProgress(updateProgress),
      window.updates.onDownloaded?.(updateDownloaded),
      window.updates.onNone(updateNone),
      window.updates.onError(updateError),
    ];

    return () => {
      for (const dispose of disposers) {
        if (typeof dispose === "function") dispose();
      }
    };
  }, []);

  return null;
};
