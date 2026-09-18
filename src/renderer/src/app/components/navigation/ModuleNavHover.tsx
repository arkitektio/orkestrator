import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import React, { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { NavLink } from "react-router-dom";

import { MODULE_NAV, preloadModuleNav } from "./moduleNavRegistry";

/** Delay before the first card of a hover run opens. */
const OPEN_DELAY = 200;
const CLOSE_DELAY = 160;
/**
 * How long after the last card closed a neighbour still opens instantly — the
 * pointer crossing the gap between two tiles should not restart the delay.
 */
const SKIP_DELAY = 400;

type HoverGroup = {
  openKey: string | null;
  /** True while a card is open, and for `SKIP_DELAY` after the last closed. */
  unfolded: boolean;
  setOpen: (key: string, open: boolean) => void;
};

const HoverGroupContext = createContext<HoverGroup | null>(null);

/**
 * One open module card at a time, menubar-style: the first card waits for
 * `OPEN_DELAY`, but once one is open, moving onto another tile switches to its
 * card at once instead of waiting out a close and a fresh open.
 *
 * Radix's HoverCard has no group of its own (NavigationMenu does, but it is
 * built around a single shared viewport for a horizontal bar, which does not
 * fit a wrapping grid of icons), so the cards are controlled from here.
 */
export const ModuleNavHoverGroup = ({
  preload = [],
  children,
}: {
  /** Module keys whose pane chunks are fetched once the browser is idle. */
  preload?: string[];
  children: React.ReactNode;
}) => {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [unfolded, setUnfolded] = useState(false);
  const foldTimer = useRef<number | undefined>(undefined);

  const setOpen = useCallback((key: string, open: boolean) => {
    window.clearTimeout(foldTimer.current);
    if (open) {
      setOpenKey(key);
      setUnfolded(true);
      return;
    }
    // A stale close from the card we just switched away from must not close
    // the one that replaced it.
    setOpenKey((current) => (current === key ? null : current));
    foldTimer.current = window.setTimeout(() => setUnfolded(false), SKIP_DELAY);
  }, []);

  useEffect(() => () => window.clearTimeout(foldTimer.current), []);

  // Warm the pane chunks before anyone hovers, so the first card opens with
  // its links rather than an empty box waiting on a network round trip.
  const preloadKey = preload.join(",");
  useEffect(() => {
    if (!preloadKey) return;
    const run = () => preloadKey.split(",").forEach(preloadModuleNav);
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(run, { timeout: 2000 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = setTimeout(run, 500);
    return () => clearTimeout(handle);
  }, [preloadKey]);

  const value = useMemo(() => ({ openKey, unfolded, setOpen }), [openKey, unfolded, setOpen]);

  return <HoverGroupContext.Provider value={value}>{children}</HoverGroupContext.Provider>;
};

/**
 * A module's own navigation, on hover over its icon.
 *
 * These links used to sit permanently in the rail (and before that, in a
 * resizable pane of their own beside the page). Both were a standing cost for
 * something you need for a moment: the rail's vertical run is worth more to the
 * pinned routes below, and the links you actually revisit end up pinned anyway.
 *
 * The pane is mounted only while the card is open — `HoverCardContent` does not
 * render its children until then — which matters because a module's pane runs
 * that module's queries on mount. `ready` gates it further: the Apollo client
 * for a service only exists once that service is ready.
 */
export const ModuleNavHover = ({
  moduleKey,
  ready,
  to,
  label,
  icon,
  children,
}: {
  moduleKey: string;
  ready: boolean;
  /** The module's home, which the card's header links to. */
  to: string;
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const group = useContext(HoverGroupContext);
  // Outside a group each card manages itself, with the plain delay.
  const [localOpen, setLocalOpen] = useState(false);

  const Nav = ready ? MODULE_NAV[moduleKey] : undefined;

  if (!Nav) {
    return <>{children}</>;
  }

  const open = group ? group.openKey === moduleKey : localOpen;
  const setOpen = (next: boolean) =>
    group ? group.setOpen(moduleKey, next) : setLocalOpen(next);

  return (
    <HoverCard
      open={open}
      onOpenChange={setOpen}
      openDelay={group?.unfolded ? 0 : OPEN_DELAY}
      closeDelay={CLOSE_DELAY}
    >
      {/* Start fetching the chunk the moment the pointer arrives, not when the
          delay has run out. */}
      <HoverCardTrigger asChild onPointerEnter={() => preloadModuleNav(moduleKey)}>
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-auto max-w-[calc(100vw-6rem)] max-h-[75vh] overflow-y-auto bg-popover p-0"
        // Following a link is the end of the visit; the card should not stay
        // hanging over the page it just opened.
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <NavLink
          to={to}
          className="mb-1 flex items-center gap-2 border-b border-border/50 px-3 py-2.5 text-foreground hover:text-primary"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
            {icon}
          </span>
          <span className="text-sm font-medium">{label}</span>
        </NavLink>
        <div className="px-2 pt-1">
          {/* Null while the module's chunk loads, so the card does not flash an
              empty box at its full height and then reflow. */}
          <Suspense fallback={null}>
            <Nav />
          </Suspense>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

/** Whether hovering this module's tile opens a navigation card. */
export const hasModuleNav = (moduleKey: string, ready: boolean) =>
  ready && moduleKey in MODULE_NAV;

export default ModuleNavHover;
