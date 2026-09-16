import { pinKey } from "@/command/pins";
import { usePins } from "@/command/PinsProvider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { smartRegistry } from "@/providers/smart/registry";
import { Plus, X } from "lucide-react";
import useReactRouterBreadcrumbs from "use-react-router-breadcrumbs";
import { useLocation } from "react-router-dom";

/**
 * The pinned routes, as links down the rail.
 *
 * Only what the user chose to keep — nothing accumulates here on its own, which
 * is what keeps the rail short and everything in it deliberate. History lives in
 * the palette's recents instead.
 */
export const RailPins = () => {
  const { pins, activeKey, select, unpin, pin, isCurrentPinned, canPin } = usePins();
  const { pathname } = useLocation();
  const breadcrumbs = useReactRouterBreadcrumbs();

  const currentLabel =
    [...breadcrumbs]
      .reverse()
      .map(({ breadcrumb }) => (typeof breadcrumb === "string" ? breadcrumb : undefined))
      .find(Boolean) ?? pathname;

  // The dashboard is where the rail already takes you; offering to pin it is
  // offering a duplicate of the app's own home. Signed out there is no
  // membership to attach a pin to at all.
  const canPinHere = canPin && pathname !== "/" && !isCurrentPinned;

  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-2 pb-2">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-sidebar px-2 pb-1 pt-0.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Pinned
        </span>
        {canPinHere && (
          <button
            type="button"
            aria-label={`Pin ${currentLabel}`}
            title={`Pin ${currentLabel}`}
            onClick={() => pin({ kind: "route", route: pathname, label: currentLabel })}
            className="rounded p-0.5 text-muted-foreground/70 transition-colors hover:bg-background hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {!canPin ? (
        // Pins belong to a membership: an entity id is scoped to one
        // organization, so a pin made with nobody signed in would point at
        // something this app could not resolve and could not honestly carry
        // into whichever organization signed in next.
        <p className="px-2 pb-1 text-[11px] leading-relaxed text-muted-foreground/60">
          Sign in to pin pages here.
        </p>
      ) : pins.length === 0 ? (
        <p className="px-2 pb-1 text-[11px] leading-relaxed text-muted-foreground/60">
          Pin a page to keep it here.
        </p>
      ) : (
        pins.map((entry) => {
          const key = pinKey(entry);
          const active = key === activeKey;
          const typeName =
            entry.kind === "entity"
              ? smartRegistry.getDisplayName(entry.identifier)
              : undefined;

          return (
            <ContextMenu key={key}>
              <ContextMenuTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  title={typeName ? `${entry.label} · ${typeName}` : entry.label}
                  onClick={() => select(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      select(key);
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
                  <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                  <button
                    type="button"
                    aria-label={`Unpin ${entry.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      unpin(key);
                    }}
                    // Revealed on hover so the rail stays quiet at rest, but
                    // kept in the layout so labels do not shift under the
                    // pointer as it moves down the list.
                    className="shrink-0 rounded opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 focus-visible:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onSelect={() => unpin(key)}>Unpin</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })
      )}
    </div>
  );
};

export default RailPins;
