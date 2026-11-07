import { useCallback } from "react";
import { createPath, useNavigate, type NavigateFunction } from "react-router-dom";

import { useTabId } from "./TabContext";
import { useTabActions } from "./TabsProvider";

/**
 * `useNavigate`, minding sidebar tabs (`TabRecord.sidebar`): inside one shown
 * in a split, a navigation to an app path goes to the pane BESIDE it, as its
 * links do. Anywhere else, and for history steps (`navigate(-1)`) or a
 * relative path, it is the pane's own `navigate`.
 *
 * For navigation on the user's behalf from something they pressed (a local
 * action's `navigate`); a page moving itself keeps `useNavigate`.
 */
export const usePaneNavigate = (): NavigateFunction => {
  const navigate = useNavigate();
  const tabId = useTabId();
  const { navigateSibling } = useTabActions();

  return useCallback(
    ((to, options) => {
      if (typeof to === "number") return navigate(to);
      const path = typeof to === "string" ? to : createPath(to);
      if (tabId && path.startsWith("/") && navigateSibling(tabId, path)) return;
      return navigate(to, options);
    }) as NavigateFunction,
    [navigate, tabId, navigateSibling],
  );
};
