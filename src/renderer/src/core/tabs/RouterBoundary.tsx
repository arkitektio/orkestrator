import React from "react";
import { UNSAFE_LocationContext, UNSAFE_NavigationContext } from "react-router-dom";

/**
 * Lets a router be mounted underneath another router.
 *
 * react-router refuses to render a `<Router>` inside one — it checks whether
 * `LocationContext` is already set and throws "You cannot render a <Router>
 * inside another <Router>". That guard is right for the mistake it catches and
 * wrong for what tabs need: one chrome-level router that always reflects the
 * active tab (so every `useNavigate` in the provider tree keeps working
 * unchanged), and beneath it, one router per tab with its own history.
 *
 * Both contexts default to `null`, which is exactly the "no router here" state
 * the guard tests for. Providing `null` again re-creates it, so the tab's
 * router mounts cleanly. Nothing rendered between the chrome router and this
 * boundary uses `<Routes>`, so `RouteContext` needs no reset.
 *
 * The `as never` casts are the honest price of using contexts react-router
 * marks UNSAFE: their value types do not admit `null` even though `null` is
 * their default. This is the one place in the codebase that pays it.
 */
export const RouterBoundary = ({ children }: { children: React.ReactNode }) => (
  <UNSAFE_LocationContext.Provider value={null as never}>
    <UNSAFE_NavigationContext.Provider value={null as never}>{children}</UNSAFE_NavigationContext.Provider>
  </UNSAFE_LocationContext.Provider>
);

export default RouterBoundary;
