import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useTabId } from "./TabContext";
import { useTabActions } from "./TabsProvider";

/**
 * Give the tab this page is in the page's own name.
 *
 * Only strings are reported — a `title` that is a component (an avatar, a
 * badge) has no text a tab strip can show, and the path-derived fallback
 * stays in place for it. Outside any tab (tests, the odd page mounted in a
 * dialog) this is a no-op.
 */
export const useTabTitle = (title: unknown): void => {
  const tabId = useTabId();
  const { pathname } = useLocation();
  const { setLabel } = useTabActions();

  const label = typeof title === "string" ? title.trim() : "";

  useEffect(() => {
    if (!tabId || !label) return;
    setLabel(tabId, label, { source: "page", pathname });
  }, [tabId, label, pathname, setLabel]);
};
