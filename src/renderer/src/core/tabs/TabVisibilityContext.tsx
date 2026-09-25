import { createContext, useContext } from "react";

/**
 * Whether the tab this component lives in is the one on screen.
 *
 * A warm tab stays mounted while hidden so its scroll, form state and any
 * loaded scene survive a switch — but "mounted" and "should be doing work"
 * are different things. This is how a component finds out which it is; the
 * scene viewer uses it to stop scheduling frames.
 *
 * Defaults to `true` so anything rendered outside a tab — and every existing
 * test — behaves exactly as before.
 */
export const TabVisibilityContext = createContext<boolean>(true);

export const useTabVisible = (): boolean => useContext(TabVisibilityContext);
