import React, { useEffect, useState } from "react";
import { unstable_HistoryRouter as HistoryRouter, useLocation } from "react-router-dom";
import useReactRouterBreadcrumbs from "use-react-router-breadcrumbs";

import { breadcrumbText } from "@/core/command/breadcrumbText";
import { cn } from "@/core/util/utils";

import { RouterBoundary } from "./RouterBoundary";
import { SplitDivider } from "./SplitDivider";
import { loadSplitRatio } from "./splitRatio";
import { TabIdContext } from "./TabContext";
import { TabLayoutContext } from "./TabLayoutContext";
import { TabPaneContext, type TabPane } from "./TabPaneContext";
import { TabVisibilityContext } from "./TabVisibilityContext";
import { useActiveTabId, useSplit, useTabActions, useWarmTabs } from "./TabsProvider";

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
  const { setLabel } = useTabActions();
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
 * A SPLIT shows two of them side by side. The tabs stay exactly where they
 * are in the DOM — siblings in the content card, laid out with `order` and a
 * divider between — because moving one into a pane wrapper would remount it,
 * and a remount is what the kept-alive scheme exists to avoid. The pane you
 * last pressed is the active tab; the other one is merely visible, so the
 * chrome's Back/Forward, the hash and the palette keep their single meaning.
 *
 * `RouterBoundary` is what lets these routers mount beneath the chrome-level
 * `ActiveTabRouter` without react-router's nested-router guard firing.
 *
 * No `basename`: entries are app-relative; the hash mirror owns `baseName`.
 */
export const TabOutlet = ({ routes }: { routes: React.ReactNode }) => {
  const warmTabs = useWarmTabs();
  const activeId = useActiveTabId();
  const split = useSplit();
  const { focus } = useTabActions();
  const [ratio, setRatio] = useState(loadSplitRatio);

  const paneOf = (id: string): TabPane | null =>
    split ? (split.left === id ? "left" : split.right === id ? "right" : null) : null;

  return (
    <>
      {warmTabs.map((tab) => {
        const active = tab.id === activeId;
        const pane = paneOf(tab.id);
        const visible = active || pane !== null;
        return (
          <div
            key={tab.id}
            data-tab-id={tab.id}
            data-active={active}
            data-pane={pane ?? undefined}
            // Pressing anywhere in a pane focuses its tab, before the press
            // reaches whatever was under it — as clicking a window raises it.
            onPointerDownCapture={pane && !active ? () => focus(tab.id) : undefined}
            className={cn(
              !visible && "hidden",
              visible && "flex min-h-0 min-w-0",
              visible && pane === null && "flex-1",
              // The left pane holds its share; the right takes the rest.
              pane === "left" && "shrink-0 grow-0",
              pane === "right" && "flex-1",
              // Each pane of a split is a card of its own — the same card the
              // content area is when whole (`AppLayout`), which steps back to
              // let the window surface show through the gap between them. The
              // clip-path and isolation are what keep a composited page layer
              // (a scene canvas, a blur) inside the corners; see there.
              pane !== null &&
                "isolate overflow-hidden rounded-xl border bg-background shadow-sm [clip-path:inset(0_round_var(--radius-xl))]",
              // The focused pane is told by its edge, and only while split:
              // with one pane there is nothing to tell apart.
              pane !== null && (active ? "border-primary/40" : "border-border/60"),
            )}
            style={
              pane === "left"
                ? { order: 0, flexBasis: `calc(${ratio * 100}% - 0.25rem)` }
                : pane === "right"
                  ? { order: 2 }
                  : undefined
            }
          >
            <RouterBoundary>
              <HistoryRouter history={tab.history}>
                <TabIdContext.Provider value={tab.id}>
                  <TabPaneContext.Provider value={pane}>
                    <TabLayoutContext.Provider value={tab.layout}>
                      <TabVisibilityContext.Provider value={visible}>
                        <TabTitleReporter tabId={tab.id} />
                        {routes}
                      </TabVisibilityContext.Provider>
                    </TabLayoutContext.Provider>
                  </TabPaneContext.Provider>
                </TabIdContext.Provider>
              </HistoryRouter>
            </RouterBoundary>
          </div>
        );
      })}
      {split && <SplitDivider ratio={ratio} onChange={setRatio} />}
    </>
  );
};

export default TabOutlet;
