import { smartRegistry } from "@/providers/smart/registry";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useCommandPalette } from "./CommandPaletteProvider";
import { routeOfPin, type Pin } from "./pins";
import { useTabs } from "./tabs/TabsProvider";
import { useRecordRecent } from "./useRecordRecent";

/**
 * What happens when a result is chosen from the palette.
 *
 * One implementation for every source — entity search, navigation, recents —
 * because "what does picking this do" is a property of HOW the palette was
 * opened, not of which list the row came from. ⌘K navigates the active tab;
 * ⌘T opens the result in a NEW tab, with its own history.
 *
 * Recording the recent happens either way: you went there, so it is history
 * regardless of which tab you went there in.
 */
export const useOpenTarget = () => {
  const { intent } = useCommandPalette();
  const { open } = useTabs();
  const navigate = useNavigate();
  const record = useRecordRecent();

  return useCallback(
    (target: Pin) => {
      record(target);

      const to = routeOfPin(target, (identifier, id) =>
        smartRegistry.buildModelPath(identifier, id),
      );

      // A model the deployment no longer registers has no path; do nothing
      // rather than navigate to `/undefined`.
      if (!to) return;

      if (intent === "new-tab") {
        open(to, { label: target.label });
      } else {
        navigate(to);
      }
    },
    [intent, open, navigate, record],
  );
};
