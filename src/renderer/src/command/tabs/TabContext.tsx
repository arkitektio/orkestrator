import { createContext, useContext } from "react";

/**
 * The id of the tab a component is rendered in, or `null` outside any tab.
 *
 * What lets a page deep inside the routes address ITS tab — to report its
 * title, for instance — without the tab manager having to know what pages
 * exist. Provided by `TabOutlet`.
 */
export const TabIdContext = createContext<string | null>(null);

export const useTabId = (): string | null => useContext(TabIdContext);
