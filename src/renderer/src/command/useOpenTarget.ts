import { smartRegistry } from "@/providers/smart/registry";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useCommandPalette } from "./CommandPaletteProvider";
import { usePins } from "./PinsProvider";
import { routeOfPin, type Pin } from "./pins";
import { useRecordRecent } from "./useRecordRecent";

/**
 * What happens when a result is chosen from the palette.
 *
 * One implementation for every source — entity search, navigation, recents —
 * because "what does picking this do" is a property of HOW the palette was
 * opened, not of which list the row came from. ⌘K navigates; ⌘T also pins the
 * result into the rail, which is what makes it a new tab.
 *
 * Recording the recent happens either way: you went there, so it is history
 * regardless of whether you also chose to keep it.
 */
export const useOpenTarget = () => {
  const { intent } = useCommandPalette();
  const { pin, canPin } = usePins();
  const navigate = useNavigate();
  const record = useRecordRecent();

  return useCallback(
    (target: Pin) => {
      record(target);

      // Signed out, ⌘T still takes you there — it just cannot leave a pin
      // behind, because there is no membership to attach one to.
      if (intent === "new-tab" && canPin) {
        pin(target);
      }

      const to = routeOfPin(target, (identifier, id) =>
        smartRegistry.buildModelPath(identifier, id),
      );

      // A model the deployment no longer registers has no path; do nothing
      // rather than navigate to `/undefined`.
      if (to) {
        navigate(to);
      }
    },
    [intent, pin, canPin, navigate, record],
  );
};
