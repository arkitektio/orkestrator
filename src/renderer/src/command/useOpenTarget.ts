import { smartRegistry } from "@/providers/smart/registry";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useCommandPalette } from "./CommandPaletteProvider";
import { useTabs } from "./tabs/TabsProvider";
import { useRecordRecent } from "./useRecordRecent";

/**
 * Something the palette can take you to: a thing, or a page. The same record
 * shape as `recents.ts`, minus the timestamp — one vocabulary across the
 * palette's sources and its history.
 */
export type OpenTarget =
  | { kind: "entity"; identifier: string; id: string; label: string }
  | { kind: "route"; route: string; label: string };

/** Where a target points; `undefined` for a model no longer registered. */
const routeOfTarget = (target: OpenTarget): string | undefined => {
  if (target.kind === "route") return target.route;
  const path = smartRegistry.buildModelPath(target.identifier, target.id);
  return path ? (path.startsWith("/") ? path : `/${path}`) : undefined;
};

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
    (target: OpenTarget) => {
      record(target);

      const to = routeOfTarget(target);

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
