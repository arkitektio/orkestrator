import React from "react";
import { Router } from "react-router-dom";

import { useActiveTabView } from "./TabsProvider";

/**
 * The chrome-level router: always the ACTIVE tab.
 *
 * Everything above the tab outlet — the rail, the palette, dialogs, the agent
 * provider, `LocalActionProvider`, breadcrumbs — already calls `useNavigate`
 * and `useLocation`. Wrapping all of it in a router that reflects whichever
 * tab is active means none of those call sites change: "navigate" simply
 * means "navigate the active tab".
 *
 * This is the low-level `<Router>` rather than `unstable_HistoryRouter` for
 * one concrete reason. `HistoryRouter` binds to a single history instance for
 * its lifetime, so switching tabs would need `key={activeId}` — which remounts
 * the entire provider tree beneath it (Arkitekt bootstrap, open dialogs, the
 * agent). `<Router>` accepts a new `navigator` on re-render, and `useNavigate`
 * re-memoises on it. Each tab's OWN router, beneath the outlet, is a
 * `HistoryRouter`; only this one has to swap.
 *
 * No `basename`: tab histories hold app-relative paths, and the hash mirror is
 * what owns the web build's `baseName`.
 */
export const ActiveTabRouter = ({ children }: { children: React.ReactNode }) => {
  const { history, location, action } = useActiveTabView();

  return (
    <Router location={location} navigationType={action} navigator={history}>
      {children}
    </Router>
  );
};

export default ActiveTabRouter;
