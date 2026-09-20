import { createContext, useContext } from "react";

/**
 * Which pane of a split the tab this component lives in occupies, or `null`
 * when the view is not split (or outside any tab).
 *
 * For the little that must differ per pane — a layout's saved panel sizes,
 * say, which two panes on screen at once must not share. Provided by
 * `TabOutlet`.
 */
export type TabPane = "left" | "right";

export const TabPaneContext = createContext<TabPane | null>(null);

export const useTabPane = (): TabPane | null => useContext(TabPaneContext);
