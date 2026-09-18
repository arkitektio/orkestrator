import { NAV_SPRING_DELAY_MS } from "@/components/ui/link";
import { useSpringLoaded } from "@/lib/dnd/react";
import { cn } from "@/lib/utils";
import { acceptsSmartDrag } from "@/providers/smart/dragPayload";
import React from "react";
import {
  NavLink,
  useNavigate
} from "react-router-dom";

export type PaneLinkProps = {
  to: string;
  children: React.ReactNode;
  className?: string;
};

/** The row every module-nav link uses; linker `PaneLink`s go through here too. */
export const paneLinkClass =
  "flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0";

export const PaneLink = (props: PaneLinkProps) => {
  const navigate = useNavigate();

  const { ref, isOver } = useSpringLoaded({
    accepts: acceptsSmartDrag,
    delayMs: NAV_SPRING_DELAY_MS,
    onFire: () => navigate(props.to),
  });

  return (
    <div ref={ref} className={isOver ? "animate-pulse" : undefined}>
      <NavLink to={props.to}>
        {({ isActive }) => (
          <div
            className={cn(
              paneLinkClass,
              isActive
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              props.className,
            )}
          >
            {props.children}
          </div>
        )}
      </NavLink>
    </div>
  );
};

/**
 * A module's navigation, laid out as columns of `SidePaneGroup` sections.
 *
 * CSS columns rather than a grid: groups differ a lot in height, and columns
 * pack them without the row gaps a grid would leave. The width is fixed per
 * column count because a hover card has no width of its own to fill.
 */
export const SidePaneNav = ({
  columns = 2,
  children,
}: {
  columns?: number;
  children: React.ReactNode;
}) => (
  <nav
    className="text-xs"
    style={{
      columnCount: columns,
      columnGap: "1rem",
      width: `calc(${columns} * 12rem + ${columns - 1} * 1rem)`,
      maxWidth: "100%",
    }}
  >
    {children}
  </nav>
);

/**
 * One titled group of links — a plain section, never a card: the hover card
 * around it is already the card. Empty groups render nothing (unless they carry an action,
 * e.g. "create"); long ones show `limit` rows and a link to the full list.
 */
export const SidePaneGroup: React.FunctionComponent<{
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  /** Show at most this many rows. */
  limit?: number;
  /** Where "Show all" leads once `limit` cuts rows off. */
  moreTo?: string;
}> = ({ title, children, action, limit, moreTo }) => {
  const items = React.Children.toArray(children);
  if (items.length === 0 && !action) return null;

  const shown = limit !== undefined ? items.slice(0, limit) : items;
  const hidden = items.length - shown.length;

  return (
    <section className="mb-3 break-inside-avoid">
      <div className="flex h-6 items-center justify-between gap-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground [&_a:hover]:text-foreground [&_button]:h-5 [&_button]:w-5">
        <span className="truncate">{title}</span>
        {action}
      </div>
      {items.length > 0 && <div className="flex flex-col gap-px">{shown}</div>}
      {hidden > 0 && moreTo && (
        <NavLink
          to={moreTo}
          className="block px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          Show all
        </NavLink>
      )}
    </section>
  );
};
