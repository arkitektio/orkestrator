import { useMemo } from "react";
import type { Location, To } from "@remix-run/router";

import { activeTab } from "./tabs";
import { useTabsState } from "./TabsProvider";

/**
 * The two things a router cannot give the rail.
 *
 * Components inside `ActiveTabRouter` should keep using `useNavigate` and
 * `useLocation` — they already resolve to the active tab. This exists for
 * what those cannot express: whether Back and Forward have anywhere to go
 * (a `HashRouter` never exposed depth, which is why the rail's buttons could
 * never be greyed), and navigating from somewhere with no router context.
 */
export type ActiveTabNavigation = {
  location: Location;
  canGoBack: boolean;
  canGoForward: boolean;
  navigate: (to: To | number, options?: { replace?: boolean; state?: unknown }) => void;
  back: () => void;
  forward: () => void;
};

export const useActiveTabNavigation = (): ActiveTabNavigation => {
  const state = useTabsState();
  const { history } = activeTab(state);
  // Read the getters into locals: the history object is stable per tab, so
  // the memo must key on what actually moves.
  const { location, canGoBack, canGoForward } = history;

  return useMemo(
    () => ({
      location,
      canGoBack,
      canGoForward,
      navigate: (to, options) => {
        if (typeof to === "number") {
          history.go(to);
        } else if (options?.replace) {
          history.replace(to, options.state);
        } else {
          history.push(to, options?.state);
        }
      },
      back: () => {
        if (canGoBack) history.go(-1);
      },
      forward: () => {
        if (canGoForward) history.go(1);
      },
    }),
    [history, location, canGoBack, canGoForward],
  );
};
