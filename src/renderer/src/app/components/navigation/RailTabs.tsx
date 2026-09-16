import { useCommandPalette } from "@/command/CommandPaletteProvider";
import { useTabs } from "@/command/tabs/TabsProvider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

/**
 * The open tabs, as a strip in the rail.
 *
 * Sits above the pinned routes: tabs are the working set — what is open right
 * now, each with its own history — and pins are the bookmarks beneath them.
 * The two look alike on purpose (same row, same dot, same hover-revealed
 * close) so the rail reads as one list with two tenses, not two widgets.
 *
 * The "+" opens the palette in new-tab mode — exactly what ⌘T does — so the
 * mouse and the keyboard create tabs through one path.
 */
export const RailTabs = () => {
  const { tabs, activeId, focus, close, closeOthers } = useTabs();
  const { togglePalette } = useCommandPalette();

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
          onClick={() => togglePalette({ fresh: true, intent: "new-tab" })}
          className="rounded p-0.5 text-muted-foreground/70 transition-colors hover:bg-background hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <ContextMenu key={tab.id}>
            <ContextMenuTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                title={tab.label}
                data-tab-row={tab.id}
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
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onSelect={() => close(tab.id)}>Close</ContextMenuItem>
              <ContextMenuItem onSelect={() => closeOthers(tab.id)}>Close others</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => togglePalette({ fresh: true, intent: "new-tab" })}>
                New tab
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
};

export default RailTabs;
