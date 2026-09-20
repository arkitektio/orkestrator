import {
  useActiveTabId,
  useTabActions,
  useTabList,
} from "@/command/tabs/TabsProvider";
import { NEW_TAB_PATH, type TabRecord } from "@/command/tabs/tabs";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useSpringLoaded } from "@/lib/dnd/react";
import { SortableList, type SortableRowProps } from "@/lib/dnd/SortableList";
import { cn } from "@/lib/utils";
import { acceptsSmartDrag } from "@/providers/smart/dragPayload";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Pin, Plus, X } from "lucide-react";

/**
 * How long a drag has to rest on a tab before the tab opens.
 *
 * Long enough that sweeping across the strip on the way somewhere else opens
 * nothing; short enough that pausing on the one you mean does not feel like
 * waiting. The module icons (`DroppableNavLink`) use a full second because a
 * navigation there replaces the page under the drag; here the page you left
 * is a tab, still there, so a wrong guess costs a click.
 */
export const TAB_SPRING_DELAY_MS = 600;

/**
 * Spring-loaded tabs, as a file manager's folders.
 *
 * Mid-drag, resting on a tab focuses it, so a thing picked up in one tab can be
 * dropped on a page in another. Nothing else changes: one dnd engine spans
 * the rail and every tab, and hidden tabs stay mounted, so the drag simply
 * continues over the newly shown page and its own drop targets take it from
 * there. The row is a target only to know it is being hovered — it accepts no
 * drop of its own, so letting go on it does nothing.
 */
const useSpringLoadedTab = (tabId: string, active: boolean, focus: (id: string) => void) =>
  useSpringLoaded({
    accepts: acceptsSmartDrag,
    delayMs: TAB_SPRING_DELAY_MS,
    onFire: () => focus(tabId),
    enabled: !active,
  });

const getTabId = (tab: TabRecord) => tab.id;

/** Pinned tabs keep to the top: a tab is dragged among its own kind. */
const blockOf = (tab: TabRecord) => (tab.pinned ? "pinned" : "open");

/**
 * One row of the strip. Its own component so each can hold a drop target.
 *
 * Two nodes, two jobs. The outer one is what is dragged to reorder the strip
 * (`row.ref` from the strip's `SortableList`, which takes that drop, the rows
 * parting as it goes), and its
 * slot is the gap while it is in the air. The inner one is the spring-loaded
 * target for a *card* dragged over the rail — a tab being dragged is not a
 * card, so resting it on another tab opens nothing.
 */
const TabRow = ({
  tab,
  row,
  active,
  animateIn,
}: {
  tab: TabRecord;
  row: SortableRowProps;
  active: boolean;
  /** Opened after the strip first rendered — it arrives rather than just being there. */
  animateIn: boolean;
}) => {
  // Actions only, and deliberately: these are stable for the provider's
  // lifetime, so a row does not re-render when some other tab navigates.
  const { focus, close, closeOthers, open, setPinned, move } = useTabActions();
  const reduceMotion = useReducedMotion();
  // Read once, at mount: a tab that arrived in the BACKGROUND (⌘-click,
  // middle-click) gets a brief tint, since nothing else on screen changed to
  // say it is there. A focused new tab needs none — its page is the sign.
  const [arrivedInBackground] = useState(() => animateIn && !active);
  const { isOver, ref } = useSpringLoadedTab(tab.id, active, focus);
  // Its place in the real order, not in the one shown mid-drag.
  const { index } = row;
  const pinned = Boolean(tab.pinned);
  const togglePin = () => setPinned(tab.id, !pinned);

  return (
    <motion.div
      ref={row.ref}
      // The rows hold no position of their own: they slide to wherever the
      // order puts them, which mid-drag is around the gap.
      layout="position"
      transition={{ duration: 0.15 }}
      // A new tab slides in from the rail's edge while the rows below part for
      // it; restored tabs are simply there. Reduced motion: a fade only.
      initial={
        animateIn ? (reduceMotion ? { opacity: 0 } : { opacity: 0, x: -12, height: 0 }) : false
      }
      animate={{ opacity: 1, x: 0, height: "auto" }}
      className="min-w-0 dragging:opacity-0"
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={ref}
            role="button"
            tabIndex={0}
            title={tab.label}
            data-tab-row={tab.id}
            data-drag-over={isOver || undefined}
            onClick={() => focus(tab.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                focus(tab.id);
              }
              // Reordering without a mouse. `move` keeps the tab in its block.
              if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                e.preventDefault();
                move(tab.id, index + (e.key === "ArrowUp" ? -1 : 1));
              }
            }}
            // Middle-click closes, as it does in every browser.
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                close(tab.id);
              }
            }}
            className={cn(
              "group relative flex min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-sm transition-colors",
              active
                ? "bg-background/70 text-foreground shadow-sm ring-1 ring-border/40 backdrop-blur-sm"
                : "text-muted-foreground hover:bg-background/35 hover:text-foreground",
              // A drag resting here is about to open this tab; say so before it does.
              isOver && !active && "bg-background/50 text-foreground ring-1 ring-primary/50",
            )}
          >
            {arrivedInBackground && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-md bg-primary/20"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                active ? "bg-primary" : "bg-muted-foreground/40",
              )}
            />
            <span className="min-w-0 flex-1 truncate">{tab.label}</span>
            <button
              type="button"
              aria-label={`${pinned ? "Unpin" : "Pin"} ${tab.label}`}
              aria-pressed={pinned}
              title={pinned ? "Unpin" : "Pin"}
              onClick={(e) => {
                e.stopPropagation();
                togglePin();
              }}
              // Revealed on hover like the close beside it — except once pinned,
              // when it stays: at rest it is the whole of how a pinned tab is
              // told from the others, and it is already where you reach to undo
              // it.
              className={cn(
                "shrink-0 rounded transition-opacity hover:!opacity-100 focus-visible:opacity-100",
                pinned ? "opacity-60" : "opacity-0 group-hover:opacity-60",
              )}
            >
              <Pin className={cn("h-3 w-3", pinned && "fill-current")} />
            </button>
            {/* A pinned tab has no close under the pointer, so a kept tab is not
                lost to a stray click: unpin it, or close it on purpose — the
                menu, a middle-click, ⌘W. The slot stays, empty, so the pin does
                not slide under the pointer that just clicked it — unpinning
                would otherwise put the close exactly where the next click
                lands. */}
            {pinned ? (
              <span aria-hidden className="h-3 w-3 shrink-0" />
            ) : (
              <button
                type="button"
                aria-label={`Close ${tab.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  close(tab.id);
                }}
                // Revealed on hover so the rail stays quiet at rest, but kept
                // in the layout so labels do not shift under the pointer.
                className="shrink-0 rounded opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 focus-visible:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={togglePin}>{pinned ? "Unpin" : "Pin"}</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => close(tab.id)}>Close</ContextMenuItem>
          <ContextMenuItem onSelect={() => closeOthers(tab.id)}>Close others</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => open(NEW_TAB_PATH)}>New tab</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </motion.div>
  );
};

/**
 * The open tabs, as a strip in the rail.
 *
 * One list. A tab worth keeping is pinned where it stands — the pin on its row
 * is both the control and the indicator — rather than copied into a second
 * section: pinned tabs gather at the top, survive "Close others" and are never
 * evicted to make room.
 *
 * The "+" opens a tab on the new-tab page — exactly what ⌘T does — so the
 * mouse and the keyboard create tabs through one path.
 *
 * Drag a row to reorder: the others part around it as it goes (Alt+↑/↓ from
 * the keyboard). The order is the tabs' own — `move` — so it is kept with them.
 */
export const RailTabs = () => {
  const tabs = useTabList();
  const activeId = useActiveTabId();
  const { open, move } = useTabActions();
  // The tabs the strip first rendered with (restored ones) do not animate in.
  // Lazy STATE rather than a ref written during render: it is initialised once
  // and never written again, which is exactly what `useState`'s initialiser
  // means. A render-phase `ref.current ??=` said the same thing while breaking
  // the rule that a render must not write to a ref.
  const [bootIds] = useState<ReadonlySet<string>>(() => new Set(tabs.map((tab) => tab.id)));

  return (
    // `app-no-drag`: the rail is a window-drag region, and a drag region eats
    // the clicks — and the drag-to-reorder — of everything inside it that has
    // not opted out. The empty rail BELOW this list still moves the window.
    <div className="app-no-drag flex min-w-0 flex-col gap-0.5 px-2 pb-2">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-sidebar px-2 pb-1 pt-0.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Open
        </span>
        <button
          type="button"
          aria-label="New tab"
          title="New tab (⌘T)"
          onClick={() => open(NEW_TAB_PATH)}
          className="rounded p-0.5 text-muted-foreground/70 transition-colors hover:bg-background hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* The rows and nothing else: their places are measured from this box. */}
      <SortableList
        items={tabs}
        getId={getTabId}
        onReorder={move}
        groupOf={blockOf}
        className="flex min-w-0 flex-col gap-0.5"
      >
        {(tab, row) => (
          <TabRow
            tab={tab}
            row={row}
            active={tab.id === activeId}
            animateIn={!bootIds.has(tab.id)}
          />
        )}
      </SortableList>
    </div>
  );
};

export default RailTabs;
