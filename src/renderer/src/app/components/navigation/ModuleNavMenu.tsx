import { ArrowRight } from "lucide-react";
import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

import type { CatalogRoute } from "@/core/command/sources/routeCatalog";
import { type ModuleNavLayout, useModuleNav } from "@/core/modules/hooks/useModuleNav";
import { Popover, PopoverAnchor, PopoverContent } from "@/core/ui/popover";
import { DroppableNavLink } from "@/core/ui/link";
import { cn } from "@/core/util/utils";

/** A module with this few tiles gets one narrow column: two would look empty. */
const NARROW_MAX_TILES = 3;

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
 * objects. Those ran the module's queries every time the card opened and
 * duplicated what the module's own home page and ⌘K already show; the card
 * should open at once and cost nothing.
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

/** Where clicking a module's tile goes: its `home` page, else the module's route. */
export const useModuleHome = (moduleKey: string, fallback: string): string =>
  useModuleNav(moduleKey).home?.route ?? fallback;

/**
 * A module's card, on right-click of its tile.
 *
 * It used to open on hover, which put a card over the page every time the
 * pointer crossed the rail on its way somewhere else. A plain click now goes
 * to the module's home page; the card with every page — and, through `footer`,
 * the service's connection state — is one right-click away.
 *
 * Only the pages are gated on `ready`: a page in a module whose service is
 * down is a dead end, but the header (which opens the page that explains
 * why) and the footer still show.
 */
export const ModuleNavMenu = ({
  moduleKey,
  ready,
  to,
  label,
  icon,
  footer,
  children,
}: {
  moduleKey: string;
  ready: boolean;
  /** The module's route, which the header links to when no page is marked `home`. */
  to: string;
  label: string;
  icon?: React.ReactNode;
  /** Below the pages: the module's connection state, for one. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const nav = useModuleNav(moduleKey);
  const shown = useMemo(() => (ready ? nav : { home: nav.home, groups: [] }), [ready, nav]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          onContextMenu={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
        >
          {children}
        </div>
      </PopoverAnchor>
      <PopoverContent
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
        <ModuleNavCard nav={shown} to={to} label={label} icon={icon} />
        {footer}
      </PopoverContent>
    </Popover>
  );
};

export default ModuleNavMenu;
