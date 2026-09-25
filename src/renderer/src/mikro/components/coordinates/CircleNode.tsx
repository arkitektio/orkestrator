import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import NodeHandles from "./NodeHandles";
import { NODE_DIAMETER } from "./nodeSize";

/**
 * The shell every node in this graph wears: one circle, centred in one
 * footprint.
 *
 * The footprint is always `NODE_DIAMETER` — that is what the layout was told and
 * what keeps a size-blind stress layout from overlapping anything (nodeSize.ts)
 * — but the circle drawn in it may be smaller. A full-size node carries its name
 * inside the circle, clamped rather than truncated: a circle has more room in
 * the middle than at the edges, and three short lines fit where one long one
 * would not. A COMPACT node has no room for a name at all, so it keeps only its
 * icon and hangs the name on a plate underneath, in the footprint's own margin.
 *
 * Either way the circle sits dead centre, so every edge still attaches to the
 * position plus one radius.
 */
export const CircleNode = (props: {
  icon: LucideIcon;
  title: string;
  /** The name, already wrapped in whatever link the kind deserves. */
  children: ReactNode;
  /** Ring, border and icon colour — what kind of thing this is. */
  className: string;
  iconClassName: string;
  /** The node the walk started from, drawn as the anchor of the component. */
  emphasised?: boolean;
  /** A line under the name: the axes, the kind. */
  caption?: string;
  /** The drawn circle. Defaults to filling the footprint. */
  diameter?: number;
}) => {
  const diameter = props.diameter ?? NODE_DIAMETER;
  const compact = diameter < NODE_DIAMETER;

  return (
    <>
      <NodeHandles />
      {/* The footprint: the size the layout was told about, whatever is drawn
          in it. Its empty margin takes no hover of its own (React Flow's own
          `.react-flow__node` still does, so this is about the title tooltip and
          the link inside, not about clicks passing through). */}
      <div
        style={{ width: NODE_DIAMETER, height: NODE_DIAMETER }}
        className="pointer-events-none relative flex items-center justify-center"
      >
        <div
          title={props.title}
          style={{ width: diameter, height: diameter }}
          className={cn(
            "pointer-events-auto relative flex flex-col items-center justify-center gap-0.5 rounded-full border-2 text-center shadow-sm",
            compact ? "px-0" : "px-3",
            props.className,
            props.emphasised &&
              "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
        >
          <props.icon className={cn("h-4 w-4 shrink-0", props.iconClassName)} />
          {!compact && (
            <>
              <div className="line-clamp-3 max-w-full break-words text-[11px] font-semibold leading-tight">
                {props.children}
              </div>
              {props.caption && (
                <div className="max-w-full truncate font-mono text-[9px] leading-none text-muted-foreground">
                  {props.caption}
                </div>
              )}
            </>
          )}
        </div>
        {compact && (
          // `top-1/2` plus a radius of margin, rather than a flow sibling: the
          // plate must not move the circle off the footprint's centre, which is
          // where every edge is aimed. The chip behind it is what keeps it
          // readable over an edge passing underneath.
          <div
            title={props.title}
            style={{ marginTop: diameter / 2 + 4 }}
            className="pointer-events-auto absolute left-1/2 top-1/2 w-full -translate-x-1/2 text-center"
          >
            <span className="inline-block max-w-full rounded bg-background px-1 py-px">
              <span className="line-clamp-2 break-words text-[10px] font-semibold leading-tight">
                {props.children}
              </span>
              {props.caption && (
                <span className="block truncate font-mono text-[8px] leading-none text-muted-foreground">
                  {props.caption}
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </>
  );
};

export default CircleNode;
