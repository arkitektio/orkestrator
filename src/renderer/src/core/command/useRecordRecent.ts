import { Arkitekt } from "@/core/app/Arkitekt";
import { useCallback } from "react";

import { recordRecent, type RecentEntry } from "./recents";

/**
 * Record something the user just chose from the palette.
 *
 * Deliberately called at ACTIVATION time by each source, rather than from a
 * global route listener: every incidental navigation — a redirect, a back
 * button, a tab switch — would otherwise fill the list with things nobody chose.
 * What you picked out of the palette is exactly what you want to see at the top
 * of it next time.
 */
export const useRecordRecent = () => {
  const profileId = Arkitekt.useActiveProfileId();

  return useCallback(
    (entry: Omit<RecentEntry, "at">) => {
      recordRecent(profileId, { ...entry, at: Date.now() } as RecentEntry);
    },
    [profileId],
  );
};
