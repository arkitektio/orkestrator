import { createContext, useContext } from "react";

import type { TabLayout } from "./tabs";

/**
 * The page-layout defaults of the tab this component lives in — see
 * `TabLayout` — or `undefined` outside any tab, or for a tab opened with none.
 * `PageLayout` reads it for what to show before the URL says; provided by
 * `TabOutlet`.
 */
export const TabLayoutContext = createContext<TabLayout | undefined>(undefined);

export const useTabLayout = (): TabLayout | undefined => useContext(TabLayoutContext);
