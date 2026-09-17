import { useTabs } from "@/command/tabs/TabsProvider";
import { NEW_TAB_PATH, type TabRecord } from "@/command/tabs/tabs";
import { SMART_MODEL_DROP_TYPE } from "@/constants";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { Pin, Plus, X } from "lucide-react";
import { useEffect } from "react";
import { useDrop } from "react-dnd";

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
 * dropped on a page in another. Nothing else changes: one `DndProvider` spans
 * the rail and every tab, and hidden tabs stay mounted, so the drag simply
 * continues over the newly shown page and its own drop targets take it from
 * there. The row is a target only to know it is being hovered — it accepts no
 * drop of its own, so letting go on it does nothing.
 */
const useSpringLoadedTab = (tabId: string, active: boolean, focus: (id: string) => void) => {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: [SMART_MODEL_DROP_TYPE],
      collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
    }),
    [],
  );

  useEffect(() => {
    if (!isOver || active) return;
    const timer = window.setTimeout(() => focus(tabId), TAB_SPRING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isOver, active, tabId, focus]);

  return { isOver, drop };
};

/** One row of the strip. Its own component so each can hold a drop target. */
const TabRow = ({ tab, active }: { tab: TabRecord; active: boolean }) => {
  const { focus, close, closeOthers, open, setPinned } = useTabs();
  const { isOver, drop } = useSpringLoadedTab(tab.id, active, focus);
  const pinned = Boolean(tab.pinned);
  const togglePin = () => setPinned(tab.id, !pinned);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={(node) => {
            drop(node);
          }}
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
          }}
          // Middle-click closes, as it does in every browser.
          onAuxClick={(e) => {
            if (e.button === 1) {
              e.preventDefault();
              close(tab.id);
            }
          }}
          className={cn(
            "group flex min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-sm transition-colors",
            active
              ? "bg-background/70 text-foreground shadow-sm ring-1 ring-border/40 backdrop-blur-sm"
              : "text-muted-foreground hover:bg-background/35 hover:text-foreground",
            // A drag resting here is about to open this tab; say so before it does.
            isOver && !active && "bg-background/50 text-foreground ring-1 ring-primary/50",
          )}
        >
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
 */
export const RailTabs = () => {
  const { tabs, activeId, open } = useTabs();

  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-2 pb-2">
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

      {tabs.map((tab) => (
        <TabRow key={tab.id} tab={tab} active={tab.id === activeId} />
      ))}
    </div>
  );
};

export default RailTabs;
