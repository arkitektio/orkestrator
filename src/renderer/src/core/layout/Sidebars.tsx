import { flattenChildren } from "./flattenChildren";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/ui/tabs";
import {
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
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

// Re-exported for the callers that always imported it from here.
export { flattenChildren };

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

/** How far the edge fade reaches into the tab row, in px. */
const FADE_PX = 20;

/**
 * The tab row scrolls sideways when the rail is too narrow for every label,
 * with no scrollbar: an edge fades out only on a side that has more tabs
 * past it, so a row that fits shows no fade at all. A vertical wheel scrolls
 * it too (most mice have no horizontal wheel), and the active tab is kept in
 * view when it changes.
 */
const useTabRowOverflow = (activeTab: string) => {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const row = ref.current;
    if (!row) return;
    const start = row.scrollLeft > 1;
    const end = row.scrollLeft + row.clientWidth < row.scrollWidth - 1;
    setEdges((held) => (held.start === start && held.end === end ? held : { start, end }));
  }, []);

  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    // Translate a vertical wheel into a sideways scroll, but only while
    // there is somewhere to go: a row that fits lets the wheel pass.
    const onWheel = (event: WheelEvent) => {
      if (row.scrollWidth <= row.clientWidth) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      row.scrollLeft += event.deltaY;
    };
    row.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      row.removeEventListener("wheel", onWheel);
    };
  }, [measure]);

  useEffect(() => {
    const active = ref.current?.querySelector<HTMLElement>('[data-state="active"]');
    active?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [activeTab]);

  const mask =
    edges.start || edges.end
      ? `linear-gradient(to right, ${edges.start ? "transparent" : "black"}, black ${FADE_PX}px, black calc(100% - ${FADE_PX}px), ${edges.end ? "transparent" : "black"})`
      : undefined;
  const style: CSSProperties | undefined = mask
    ? { maskImage: mask, WebkitMaskImage: mask }
    : undefined;

  return { ref, onScroll: measure, style };
};

const SidebarsRoot = (props: {
  children?: ReactNode;
  /** localStorage key the active tab is remembered under. */
  sidebarKey?: string;
  /** The tab to open when nothing valid is remembered under `sidebarKey`. */
  defaultTab?: string;
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

  const row = useTabRowOverflow(effectiveTab);

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
      <div className="flex-initial h-16 flex items-center px-2">
        {/* Labels keep their own width and are never cut: the row scrolls
            instead (see `useTabRowOverflow`). */}
        <TabsList
          ref={row.ref}
          onScroll={row.onScroll}
          style={row.style}
          className="h-8 w-full justify-start gap-0.5 overflow-x-auto rounded-none bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.label}
              value={tab.label}
              className="h-7 flex-none cursor-pointer rounded-full px-3 text-xs data-active:bg-foreground/10 data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-foreground/15"
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
