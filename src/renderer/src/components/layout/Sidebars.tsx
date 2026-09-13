import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const ACTIVE_SIDEBAR_KEY = "active-sidebar";

export type SidebarsTabProps = {
  /** Tab label — also the tab's identity for persistence and deduping. */
  label: string;
  children?: ReactNode;
};

/**
 * Slot marker for one sidebar tab. Never renders itself — `Sidebars` reads its
 * props and mounts the children inside its own tab machinery. Conditional tabs
 * are plain JSX: `{cond && <Sidebars.Tab …>}`.
 */
const SidebarsTab = (_props: SidebarsTabProps): null => null;
SidebarsTab.displayName = "Sidebars.Tab";

/** Depth-first flatten of arrays and fragments down to plain elements. */
export const flattenChildren = (children: ReactNode): ReactNode[] =>
  Children.toArray(children).flatMap((child) =>
    isValidElement(child) && child.type === Fragment
      ? flattenChildren((child.props as { children?: ReactNode }).children)
      : [child],
  );

/**
 * Collect the `<Sidebars.Tab>` slots, in child order. A later duplicate of a
 * label replaces the earlier one's CONTENT but keeps its position — exactly
 * what map-spread used to do — so a page's `additionalSidebars` child can
 * override a layout default tab without reordering the bar.
 */
const collectTabs = (children: ReactNode): SidebarsTabProps[] => {
  const byLabel = new Map<string, SidebarsTabProps>();
  for (const child of flattenChildren(children)) {
    if (!isValidElement(child) || child.type !== SidebarsTab) continue;
    const props = child.props as SidebarsTabProps;
    byLabel.set(props.label, props);
  }
  return [...byLabel.values()];
};

const SidebarsRoot = (props: {
  children?: ReactNode;
  /** localStorage key the active tab is remembered under. */
  sidebarKey?: string;
  /** The tab to open when nothing valid is remembered under `sidebarKey`. */
  defaultTab?: string;
  /**
   * "overlay" drops the tab bar's filled background so the rail sits
   * seamlessly on a page that paints its own surface (see PageLayout's
   * `overlay` prop).
   */
  variant?: "default" | "overlay";
}) => {
  const tabs = collectTabs(props.children);

  const [activeTab, setActiveTab] = useState<string>(() => {
    // Load from local storage on initial render
    const saved = localStorage.getItem(props.sidebarKey || ACTIVE_SIDEBAR_KEY);
    const labels = tabs.map((tab) => tab.label);

    // Validate that the saved tab still exists among the children
    if (saved && labels.includes(saved)) {
      return saved;
    }
    if (props.defaultTab && labels.includes(props.defaultTab)) {
      return props.defaultTab;
    }

    return labels.at(0) || "";
  });

  // Tabs are conditional, so the set can shrink under a LIVE rail — remove a
  // scene's last mesh layer and the Meshes tab goes with it. The initializer
  // above validates only the FIRST render, so a tab that disappears while it is
  // the active one would leave `activeTab` matching no `TabsContent`, i.e. a
  // blank rail. Re-validated at render rather than corrected in an effect, so
  // there is no blank commit in between.
  const effectiveTab = tabs.some((tab) => tab.label === activeTab)
    ? activeTab
    : (tabs.at(0)?.label ?? "");

  // Save to local storage whenever the active tab changes
  useEffect(() => {
    if (effectiveTab) {
      localStorage.setItem(props.sidebarKey || ACTIVE_SIDEBAR_KEY, effectiveTab);
    }
  }, [effectiveTab, props.sidebarKey]);

  return (
    <Tabs
      value={effectiveTab}
      onValueChange={setActiveTab}
      className="w-full h-full flex flex-initial flex-col"
    >
      <div className="flex-initial h-16  flex px-2 py-2 1">
        <TabsList
          className={
            props.variant === "overlay"
              ? "w-full flex gap-2 my-auto bg-transparent"
              : "w-full flex gap-2 my-auto"
          }
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.label}
              value={tab.label}
              className="flex-1 h-full text-xs truncate px-2 py-1 cursor-pointer text-elevation-foreground/60 hover:text-elevation-foreground data-[state=active]:text-elevation-foreground data-[state=active]:bg-accent data-[state=active]:hover:bg-accent/90"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.label}
          value={tab.label}
          className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
        >
          {tab.children}
        </TabsContent>
      ))}
    </Tabs>
  );
};

/**
 * The page-rail tab stack, composed from children instead of a keyed map:
 *
 *   <Sidebars sidebarKey="SceneDetail" defaultTab="Layers">
 *     <Sidebars.Tab label="Knowledge"><KnowledgeSidebar … /></Sidebars.Tab>
 *     <Sidebars.Tab label="Layers"><SceneLayersSidebar /></Sidebars.Tab>
 *   </Sidebars>
 *
 * Child order is tab order (and decides the fallback default tab); a later
 * child with an already-used label replaces the earlier one.
 */
export const Sidebars = Object.assign(SidebarsRoot, {
  Tab: SidebarsTab,
});
