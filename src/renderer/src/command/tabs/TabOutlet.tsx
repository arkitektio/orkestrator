import React, { useEffect } from "react";
import { unstable_HistoryRouter as HistoryRouter, useLocation } from "react-router-dom";
import useReactRouterBreadcrumbs from "use-react-router-breadcrumbs";

import { breadcrumbText } from "@/lib/breadcrumbText";

import { RouterBoundary } from "./RouterBoundary";
import { TabIdContext } from "./TabContext";
import { TabVisibilityContext } from "./TabVisibilityContext";
import { useTabs } from "./TabsProvider";

/**
 * Names a tab after the page it is showing.
 *
 * Lives INSIDE the tab's router so its breadcrumbs are that tab's, not the
 * active one's. Takes the deepest crumb that is a plain string — an entity
 * name still loading arrives as a component, which is not a label — and
 * keeps reporting while the tab is warm but hidden, so its title stays current
 * in the rail. A cold tab keeps whatever label it last reported.
 */
const TabTitleReporter = ({ tabId }: { tabId: string }) => {
  const { setLabel } = useTabs();
  const { pathname } = useLocation();
  const breadcrumbs = useReactRouterBreadcrumbs();

  const label = [...breadcrumbs]
    .reverse()
    .map(({ breadcrumb }) => breadcrumbText(breadcrumb))
    .find(Boolean);

  // The FALLBACK source. With no route config the breadcrumb hook only
  // humanises path segments (as a `<span>`, which `breadcrumbText` unwraps),
  // so an entity page yields its id ("5"); the page's own `useTabTitle`
  // overrides this for the location it reports.
  useEffect(() => {
    if (label) setLabel(tabId, label, { source: "path", pathname });
  }, [label, tabId, pathname, setLabel]);

  return null;
};

/**
 * Where tabs are rendered.
 *
 * Every WARM tab gets its own `HistoryRouter` over its own memory history and
 * a full copy of the app's routes; only the active one is displayed. Hidden
 * with a class (`display:none`), not unmounted, so a switch back restores
 * scroll, form state and a loaded scene exactly as they were. Cold tabs are
 * simply absent from the map — their history object survives in the store,
 * and when they warm again they mount at the index they were left at, so Back
 * and Forward still work.
 *
 * `RouterBoundary` is what lets these routers mount beneath the chrome-level
 * `ActiveTabRouter` without react-router's nested-router guard firing.
 *
 * No `basename`: entries are app-relative; the hash mirror owns `baseName`.
 */
export const TabOutlet = ({ routes }: { routes: React.ReactNode }) => {
  const { tabs, activeId, warmIds } = useTabs();

  return (
    <>
      {tabs
        .filter((tab) => warmIds.has(tab.id))
        .map((tab) => {
          const active = tab.id === activeId;
          return (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              data-active={active}
              className={active ? "flex min-h-0 min-w-0 flex-1" : "hidden"}
            >
              <RouterBoundary>
                <HistoryRouter history={tab.history}>
                  <TabIdContext.Provider value={tab.id}>
                    <TabVisibilityContext.Provider value={active}>
                      <TabTitleReporter tabId={tab.id} />
                      {routes}
                    </TabVisibilityContext.Provider>
                  </TabIdContext.Provider>
                </HistoryRouter>
              </RouterBoundary>
            </div>
          );
        })}
    </>
  );
};

export default TabOutlet;
