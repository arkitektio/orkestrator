import { ArrowRight } from "lucide-react";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

import { type CatalogRoute, routeCatalog, routesOfModule } from "@/core/command/sources/routeCatalog";
import { useModuleHostVersion } from "@/core/modules/host/host";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/core/ui/hover-card";
import { DroppableNavLink } from "@/core/ui/link";
import { cn } from "@/core/util/utils";

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
export const ModuleNavHoverGroup = ({ children }: { children: React.ReactNode }) => {
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

  const value = useMemo(() => ({ openKey, unfolded, setOpen }), [openKey, unfolded, setOpen]);

  return <HoverGroupContext.Provider value={value}>{children}</HoverGroupContext.Provider>;
};

/** A module's pages, as its popout lays them out. */
type ModuleNavLayout = {
  home?: CatalogRoute;
  groups: { title: string; links: CatalogRoute[] }[];
};

/** The group a link without one falls into. */
const DEFAULT_GROUP = "Pages";

/** A module with this few tiles gets one narrow column: two would look empty. */
const NARROW_MAX_TILES = 3;

export const layoutModuleNav = (links: readonly CatalogRoute[]): ModuleNavLayout => {
  const home = links.find((link) => link.home);
  const groups = new Map<string, CatalogRoute[]>();
  for (const link of links) {
    if (link === home) continue;
    const title = link.group ?? DEFAULT_GROUP;
    const group = groups.get(title);
    if (group) group.push(link);
    else groups.set(title, [link]);
  }
  return { home, groups: [...groups].map(([title, links]) => ({ title, links })) };
};

/** One module's pages, re-read when a module arrives or leaves. */
const useModuleNav = (moduleKey: string): ModuleNavLayout => {
  const version = useModuleHostVersion();
  return useMemo(
    () => layoutModuleNav(routesOfModule(routeCatalog(), moduleKey)),
    // `version` is the dependency: the catalog is rebuilt when it moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moduleKey, version],
  );
};

const Tile = ({ link }: { link: CatalogRoute }) => {
  const Icon = link.icon;
  return (
    <DroppableNavLink to={link.route}>
      {({ isActive }) => (
        <span
          data-active={isActive}
          className={cn(
            "group/tile flex min-w-0 items-center gap-2.5 rounded-md p-1.5 transition-colors",
            isActive ? "bg-muted" : "hover:bg-muted/60",
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5",
              isActive
                ? "bg-background text-foreground"
                : "text-muted-foreground group-hover/tile:bg-background group-hover/tile:text-foreground",
            )}
          >
            {Icon && <Icon />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium leading-tight text-foreground">
              {link.label}
            </span>
            {link.description && (
              <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                {link.description}
              </span>
            )}
          </span>
        </span>
      )}
    </DroppableNavLink>
  );
};

const Chip = ({ link }: { link: CatalogRoute }) => {
  const Icon = link.icon;
  return (
    <DroppableNavLink to={link.route}>
      {({ isActive }) => (
        <span
          data-active={isActive}
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] transition-colors [&_svg]:h-3 [&_svg]:w-3",
            isActive
              ? "bg-muted font-medium text-foreground"
              : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {Icon && <Icon />}
          {link.label}
        </span>
      )}
    </DroppableNavLink>
  );
};

/**
 * The card's content: a header that opens the module, then its pages in
 * groups — tiles with a line of description, or chips for a group that has
 * none (the per-kind dataset pages, which the label already says enough about).
 *
 * Pages only, from the module's `navLinks`: no lists of recent or pinned
 * objects. Those ran the module's queries on every hover and duplicated what
 * the module's own home page and ⌘K already show; a card you pass over on the
 * way to a tile should open at once and cost nothing.
 */
export const ModuleNavCard = ({
  nav,
  to,
  label,
  icon,
}: {
  nav: ModuleNavLayout;
  to: string;
  label: string;
  icon?: React.ReactNode;
}) => {
  const tileCount = nav.groups.reduce(
    (n, group) => n + group.links.filter((link) => link.description).length,
    0,
  );
  const narrow = tileCount <= NARROW_MAX_TILES;

  return (
    <div className={cn("flex flex-col", narrow ? "w-64" : "w-[30rem]")}>
      <NavLink
        to={nav.home?.route ?? to}
        className="group/head flex items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-muted/60"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{label}</span>
        <span className="flex items-center gap-1 pr-1 text-[11px] text-muted-foreground transition-colors group-hover/head:text-foreground">
          {nav.home?.label ?? "Open"}
          <ArrowRight className="h-3 w-3 transition-transform group-hover/head:translate-x-0.5" />
        </span>
      </NavLink>

      {nav.groups.map(({ title, links }) => {
        const chips = links.every((link) => !link.description);
        return (
          <section key={title} className="mt-2">
            <h3 className="px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {title}
            </h3>
            {chips ? (
              <div className="flex flex-wrap gap-1 px-1.5">
                {links.map((link) => (
                  <Chip key={link.route} link={link} />
                ))}
              </div>
            ) : (
              <div className={cn("grid gap-0.5", narrow ? "grid-cols-1" : "grid-cols-2")}>
                {links.map((link) => (
                  <Tile key={link.route} link={link} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

/**
 * A module's pages, on hover over its icon.
 *
 * These links used to sit permanently in the rail (and before that, in a
 * resizable pane of their own beside the page). Both were a standing cost for
 * something you need for a moment: the rail's vertical run is worth more to the
 * open tabs below, and the pages you actually revisit end up pinned anyway.
 *
 * `ready` gates it: a page in a module whose service is down is a dead end —
 * the tile itself leads to the page that explains why.
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
  /** The module's route, which the header links to when no page is marked `home`. */
  to: string;
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const group = useContext(HoverGroupContext);
  // Outside a group each card manages itself, with the plain delay.
  const [localOpen, setLocalOpen] = useState(false);
  const nav = useModuleNav(moduleKey);

  if (!ready || nav.groups.length === 0) {
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
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-auto max-w-[calc(100vw-6rem)] max-h-[75vh] overflow-y-auto bg-popover p-1.5"
        // Following a link is the end of the visit; the card should not stay
        // hanging over the page it just opened.
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <ModuleNavCard nav={nav} to={to} label={label} icon={icon} />
      </HoverCardContent>
    </HoverCard>
  );
};

/** Whether hovering this module's tile opens a navigation card. */
export const hasModuleNav = (moduleKey: string, ready: boolean) =>
  ready && routesOfModule(routeCatalog(), moduleKey).some((link) => !link.home);

export default ModuleNavHover;
