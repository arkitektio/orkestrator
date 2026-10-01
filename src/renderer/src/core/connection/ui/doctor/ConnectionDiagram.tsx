import type {
  AliasPath,
  ConnectionDiagram as Diagram,
  DiagramPart,
  DiagramPartId,
  PartState,
} from "@/core/connection/arkitekt/doctor/diagram";
import type { Finding } from "@/core/connection/arkitekt/doctor/findings";
import { Button } from "@/core/ui/button";
import { Checkbox } from "@/core/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { cn } from "@/core/util/utils";
import {
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  getStraightPath,
  useNodesInitialized,
  useReactFlow,
  useStore,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CircleSlash, KeyRound, Laptop, Loader2, Network, Radio, Server, Waypoints } from "lucide-react";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { STATE_ICON as HOP_ICON, STATE_LABEL as HOP_LABEL } from "./ConnectionPath";

/**
 * The connection, drawn: the coordination server on top, this computer on
 * the left, the hub on the right, and the lines between them — one per
 * address from this computer to the hub. Whatever is broken is red where it
 * is broken, with its reason beside it; the rest is green.
 *
 * Pure: the model in, the picture out. React Flow does the drawing, as a
 * still picture: nothing drags, pans or zooms, and it scales to the tab.
 * Every node carries its own size and handle positions, so the edges are
 * placed without waiting for a measurement.
 */

const STATE_ICON: Record<PartState, ReactNode> = {
  ...HOP_ICON,
  checking: (
    <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden />
  ),
  absent: <CircleSlash className="size-3.5 shrink-0 text-muted-foreground/40" aria-hidden />,
};

const STATE_LABEL: Record<PartState, string> = {
  ...HOP_LABEL,
  checking: "checking",
  absent: "not part of this deployment",
};

const STROKE: Record<PartState, string> = {
  ok: "text-emerald-500",
  warning: "text-amber-500",
  failed: "text-destructive",
  unknown: "text-muted-foreground/50",
  checking: "text-muted-foreground/70",
  absent: "text-muted-foreground/25",
};

const BORDER: Record<PartState, string> = {
  ok: "border-emerald-500/40",
  warning: "border-amber-500/50",
  failed: "border-destructive/60",
  unknown: "border-dashed border-border",
  checking: "border-dashed border-border",
  absent: "border-dashed border-border/60",
};

const REASON: Partial<Record<PartState, string>> = {
  failed: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
};

const dashed = (state: PartState) => state === "unknown" || state === "absent" || state === "checking";

/* ─────────────────────────────── geometry ─────────────────────────────── */

/** Every party is the same box: three equals, none of them the "main" one. */
const TILE = { width: 190, height: 76 };
const HUB = TILE;
const NOTE = { width: 320, height: 76 };
/** The extra room the question about the system Tailscale takes in the note. */
const ASK = 74;
const WIDTH = 760;
/** The level this computer and the hub face each other on. */
const LEVEL = 250;
/** How far apart two neighbouring address lines bow, at their widest. */
const FAN = 40;
/** The extra bow between the last direct line and the first mesh one. */
const LANE_GAP = 18;

type HandleSpec = { id: string; type: "source" | "target"; position: Position; x: number; y: number };

/** A handle as a point, not a dot: the line must end ON the tile's edge. */
const POINT = "!pointer-events-none !h-0 !min-h-0 !w-0 !min-w-0 !border-0 !opacity-0";

const handle = (id: string, type: HandleSpec["type"], position: Position, x: number, y: number): HandleSpec => ({
  id,
  type,
  position,
  x,
  y,
});

/* ──────────────────────────────── hovers ──────────────────────────────── */

/**
 * What a part says when hovered: a plain tooltip, in the theme's own surface
 * colours. The shared tooltip is inverted (light on a dark page); these carry
 * several lines and a state, and read better as a quiet popover-coloured
 * panel, so the colours are set here and the arrow follows them.
 */
const Hover = ({
  name,
  trigger,
  title,
  subtitle,
  icon,
  children,
}: {
  name?: string;
  trigger: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>{trigger}</TooltipTrigger>
    <TooltipContent
      side="top"
      sideOffset={6}
      data-report={name}
      className="max-w-72 space-y-1 border border-border bg-popover text-left text-popover-foreground shadow-md [&_svg.z-50]:!bg-popover [&_svg.z-50]:!fill-popover"
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="min-w-0 truncate font-medium">{title}</span>
        {subtitle && <span className="shrink-0 text-muted-foreground">· {subtitle}</span>}
      </div>
      {children}
    </TooltipContent>
  </Tooltip>
);

const HoverLines = ({ lines }: { lines: string[] }) => (
  <ul className="space-y-0.5 text-xs text-muted-foreground">
    {lines.map((line) => (
      <li key={line} className="break-words">
        {line}
      </li>
    ))}
  </ul>
);

/* ───────────────────────── findings, on request ───────────────────────── */

type Toggle = {
  open: DiagramPartId | undefined;
  onToggle?: (id: DiagramPartId) => void;
  /** Answers "may `tailscale status` be run?"; absent where nobody can answer. */
  onTailscaleAnswer?: (allow: boolean, remember: boolean) => void;
};
const ToggleContext = createContext<Toggle>({ open: undefined });

/**
 * One part of the picture. Hovering (or focusing) it shows its report: what
 * was looked at there and what came back. It is clickable only when the
 * doctor has findings about it to open.
 */
const Expandable = ({
  id,
  part,
  className,
  children,
}: {
  id: DiagramPartId;
  part: DiagramPart;
  className?: string;
  children: ReactNode;
}) => {
  const { open, onToggle } = useContext(ToggleContext);
  // React Flow switches pointer events off on a node that cannot be dragged
  // or selected; what is inside it still has to be hoverable and clickable.
  const style = { pointerEvents: "all" as const };
  const element =
    onToggle && part.findings.length > 0 ? (
      <button
        type="button"
        data-part={id}
        data-state={part.state}
        aria-expanded={open === id}
        className={cn(className, "nodrag nopan cursor-pointer hover:bg-muted/40")}
        style={style}
        onClick={() => onToggle(id)}
      >
        {children}
      </button>
    ) : (
      <div data-part={id} data-state={part.state} className={className} style={style}>
        {children}
      </div>
    );
  if (!part.report?.length) return element;
  return (
    <Hover name={id} trigger={element} title={part.label} subtitle={STATE_LABEL[part.state]} icon={STATE_ICON[part.state]}>
      <HoverLines lines={part.report} />
    </Hover>
  );
};

const Reason = ({ part }: { part: DiagramPart }) =>
  part.reason && REASON[part.state] ? (
    <span className={cn("block truncate text-[11px] leading-snug", REASON[part.state])}>
      {part.reason}
    </span>
  ) : null;

/* ───────────────────────────────── nodes ──────────────────────────────── */

type TileData = {
  partId: DiagramPartId;
  part: DiagramPart;
  icon: "coordination" | "client" | "hub";
  handles: HandleSpec[];
  /** The one service this page needs, drawn inside the hub. */
  service?: DiagramPart;
};
type TileNode = Node<TileData, "tile">;

const ICON: Record<TileData["icon"], ReactNode> = {
  coordination: <KeyRound aria-hidden />,
  client: <Laptop aria-hidden />,
  hub: <Server aria-hidden />,
};

const Tile = ({ data }: NodeProps<TileNode>) => {
  const { part, service } = data;
  return (
    <div
      className={cn("flex h-full w-full flex-col rounded-lg border bg-background text-left shadow-sm", BORDER[part.state])}
      // So the full text of a truncated line still shows on hover.
      style={{ pointerEvents: "all" }}
    >
      {data.handles.map((spec) => (
        <Handle
          key={spec.id}
          id={spec.id}
          type={spec.type}
          position={spec.position}
          isConnectable={false}
          className={POINT}
          style={{ left: spec.x, top: spec.y, right: "auto", bottom: "auto", transform: "none" }}
        />
      ))}
      <Expandable id={data.partId} part={part} className="flex w-full min-w-0 flex-1 flex-col justify-center rounded-lg px-3 text-left">
        <span className="flex items-center gap-1.5">
          <span className="shrink-0 text-muted-foreground [&>svg]:size-3.5">{ICON[data.icon]}</span>
          <span className="min-w-0 flex-1 truncate text-xs font-medium">{part.label}</span>
          {STATE_ICON[part.state]}
          <span className="sr-only">{STATE_LABEL[part.state]}</span>
        </span>
        {/* One line under the name, so every box keeps the same height: why
            it is broken when it is, otherwise what it is called. */}
        {part.reason && REASON[part.state] ? (
          <Reason part={part} />
        ) : (
          part.detail && <span className="block truncate text-[11px] text-muted-foreground">{part.detail}</span>
        )}
      </Expandable>
      {service && (
        <Expandable
          id="service"
          part={service}
          // One line: the hub's box is no taller than the others. What the
          // service's state means in full is on hover.
          className="flex h-7 w-full min-w-0 shrink-0 items-center gap-1.5 rounded-b-lg border-t border-border/60 px-3 text-left"
        >
          {STATE_ICON[service.state]}
          <span className="sr-only">{STATE_LABEL[service.state]}</span>
          <span className="min-w-0 truncate text-xs">{service.label}</span>
          {service.reason && REASON[service.state] ? (
            <span className={cn("min-w-0 flex-1 truncate text-[11px]", REASON[service.state])}>{service.reason}</span>
          ) : (
            service.detail && (
              <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{service.detail}</span>
            )
          )}
        </Expandable>
      )}
    </div>
  );
};

const StateChip = ({ part }: { part: DiagramPart }) => (
  <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 shadow-sm">
    {STATE_ICON[part.state]}
    <span className="sr-only">{STATE_LABEL[part.state]}</span>
    <span className="truncate text-[11px] text-muted-foreground">{part.label}</span>
  </span>
);

type NoteData = { part: DiagramPart; via?: string; ask?: boolean };
type NoteNode = Node<NoteData, "note">;

/**
 * The one question the diagram asks. An address on a Tailscale network the
 * app does not run can only be explained by that Tailscale, and reading it
 * means running its CLI on the user's machine — so it is asked, once.
 */
const TailscaleQuestion = ({ onAnswer }: { onAnswer: (allow: boolean, remember: boolean) => void }) => {
  const [remember, setRemember] = useState(false);
  return (
    <div
      role="group"
      aria-label="Ask Tailscale"
      className="nodrag nopan mt-1.5 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-left"
      style={{ pointerEvents: "all" }}
    >
      <p className="text-[11px] leading-snug text-muted-foreground">
        Some addresses are on a Tailscale network this app does not run. Run{" "}
        <span className="font-mono">tailscale status</span> to see how they are routed?
      </p>
      <div className="mt-1 flex items-center gap-2">
        <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => onAnswer(true, remember)}>
          Run it
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => onAnswer(false, remember)}>
          Not now
        </Button>
        <label className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <Checkbox className="size-3" checked={remember} onCheckedChange={(checked) => setRemember(checked === true)} />
          Remember
        </label>
      </div>
    </div>
  );
};

/**
 * What the lines to the hub add up to, under them: whether anything gets
 * through, the tunnel that carries them, and why not when nothing does.
 */
const Note = ({ data }: NodeProps<NoteNode>) => {
  const { part, via } = data;
  const { onTailscaleAnswer } = useContext(ToggleContext);
  return (
    <div className="flex h-full w-full flex-col items-center">
      <Expandable id="serviceLink" part={part} className="flex w-full flex-col items-center rounded-md px-1 text-center">
        <span className="sr-only">This computer to the hub</span>
        <StateChip part={part} />
        {via && (
          <span className="mt-1 inline-flex max-w-full items-center gap-1 text-[10px] text-muted-foreground">
            <Waypoints className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{via}</span>
          </span>
        )}
        {part.reason && REASON[part.state] && (
          <span className={cn("mt-0.5 line-clamp-2 text-[11px] leading-snug", REASON[part.state])}>
            {part.reason}
          </span>
        )}
      </Expandable>
      {data.ask && onTailscaleAnswer && <TailscaleQuestion onAnswer={onTailscaleAnswer} />}
    </div>
  );
};

const RELAY = { width: 96, height: 28 };
/** The room one address label takes above the relay it goes through. */
const RELAY_LABEL = 24;
const RELAY_NOTE = "Performance might be impacted: the mesh could not open a direct tunnel, so traffic takes a detour through this relay.";

type RelayData = {
  region: string;
  /** Connected another way: this relay is a spare, and drawn like one. */
  standby?: boolean;
  /** Nothing gets through it: as red as its legs. */
  failed?: boolean;
};
type RelayNode = Node<RelayData, "relay">;

/**
 * A DERP relay, as the detour it is: the mesh could not reach the hub's
 * machine directly, so the traffic goes down through somebody else's server
 * and back up. It sits UNDER the direct lines, not on them — the two legs and
 * the level they leave make a parallelogram. It works; it is slower. Hence
 * yellow, not red.
 */
const Relay = ({ data }: NodeProps<RelayNode>) => (
  <Hover
    trigger={
      <div
        data-relay={data.region}
        data-use={data.standby ? "standby" : undefined}
        className={cn(
          "flex h-full w-full items-center justify-center gap-1 rounded-md border bg-background text-[10px] shadow-sm",
          data.failed
            ? "border-destructive/60 text-destructive"
            : data.standby
              ? "border-border text-muted-foreground/70"
              : "border-amber-500/60 text-amber-600 dark:text-amber-400",
        )}
        style={{ pointerEvents: "all" }}
      >
        <Handle type="target" id="in" position={Position.Left} isConnectable={false} className={POINT} style={{ left: 0, top: RELAY.height / 2, right: "auto", bottom: "auto", transform: "none" }} />
        <Handle type="source" id="out" position={Position.Right} isConnectable={false} className={POINT} style={{ left: RELAY.width, top: RELAY.height / 2, right: "auto", bottom: "auto", transform: "none" }} />
        <Radio className="size-3 shrink-0" aria-hidden />
        <span className="sr-only">relayed through</span>
        <span className="truncate">DERP {data.region}</span>
      </div>
    }
    title={`DERP ${data.region}`}
    subtitle={data.standby ? "relay, not in use" : "relay"}
    icon={<Radio className={cn("size-3.5", data.standby ? "text-muted-foreground" : "text-amber-500")} aria-hidden />}
  >
    <p className="text-xs text-muted-foreground">{RELAY_NOTE}</p>
  </Hover>
);

/* ───────────────────────────────── edges ──────────────────────────────── */

/**
 * An address line once something is connected: the road in use is bright and
 * heavy, the spares are plain grey. A relayed road in use stays yellow — it
 * works, the long way round — only heavier.
 */
const aliasWire = (path: AliasPath, state: PartState, group?: { inUse: boolean; standby: boolean }) => {
  const inUse = group ? group.inUse : path.inUse;
  const standby = group ? group.standby : path.standby;
  if (standby) return { className: "text-muted-foreground/35", style: { stroke: "currentColor", strokeWidth: 1.5 } };
  if (inUse) {
    return {
      className: path.relay ? "text-amber-400" : "text-emerald-400",
      style: { stroke: "currentColor", strokeWidth: 3 },
    };
  }
  return wire(state);
};

const wire = (state: PartState) => ({
  className: cn(STROKE[state], state === "checking" && "animate-pulse motion-reduce:animate-none"),
  style: { stroke: "currentColor", strokeWidth: 1.5, strokeDasharray: dashed(state) ? "5 5" : undefined },
});

type LinkData = { partId: DiagramPartId; part: DiagramPart; between: string; bare?: boolean };
type LinkEdge = Edge<LinkData, "link">;

/** A line between two parties, with what it is doing on a chip at its middle. */
const Link = ({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<LinkEdge>) => {
  const [path, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  if (!data) return null;
  const { part } = data;
  return (
    <>
      <BaseEdge id={id} path={path} {...wire(part.state)} />
      {!data.bare && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute flex w-44 flex-col items-center text-center"
            style={{ transform: `translate(-50%, -12px) translate(${labelX}px, ${labelY}px)`, pointerEvents: "all" }}
          >
            <Expandable id={data.partId} part={part} className="flex max-w-full flex-col items-center rounded-md">
              <span className="sr-only">{data.between}</span>
              <StateChip part={part} />
              {part.detail && (
                <span className="mt-0.5 max-w-full truncate rounded bg-background/80 px-1 text-[10px] text-muted-foreground/80">
                  {part.detail}
                </span>
              )}
              {part.reason && REASON[part.state] && (
                <span
                  className={cn("mt-0.5 max-w-full truncate rounded bg-background/80 px-1 text-[11px]", REASON[part.state])}
                >
                  {part.reason}
                </span>
              )}
            </Expandable>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

/** Tailscale's mark: a three-by-three grid of dots, the middle row and the one under it lit. */
const TailscaleLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    {[4, 12, 20].flatMap((cy, row) =>
      [4, 12, 20].map((cx, column) => (
        <circle key={`${row}-${column}`} cx={cx} cy={cy} r={2.6} opacity={row === 1 || (row === 2 && column === 1) ? 1 : 0.3} />
      )),
    )}
  </svg>
);

/**
 * Which mesh carries an address, as a mark rather than a name: the mesh glyph
 * for the built-in one, Tailscale's own logo for a Tailscale the system runs.
 * The name is on hover; on the line it would only crowd the address out.
 */
const MeshMark = ({ path }: { path: AliasPath }) => {
  const name = path.unrouted
    ? "a mesh nothing here routes"
    : path.network === "Tailscale"
      ? "Tailscale"
      : `mesh ${path.network ?? ""}`.trim();
  return (
    <span className="inline-flex shrink-0 items-center text-muted-foreground" data-mesh={path.network ?? "unknown"}>
      {path.network === "Tailscale" ? (
        <TailscaleLogo className="size-3" />
      ) : (
        <Network className={cn("size-3", path.unrouted && "opacity-50")} aria-hidden />
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
};

type AliasData = {
  path: AliasPath;
  /** How far this line bows away from the level, when it runs the whole way. */
  offset: number;
  /** A relayed line is two legs with the relay between them. */
  leg?: "to-relay" | "from-relay";
  /**
   * Addresses that share a relay share its two legs: the first draws them (in
   * `wireState`, what the group adds up to), the rest only stack their label
   * above the relay, `stack` rows up.
   */
  stack?: number;
  wireState?: PartState;
  /** What the shared legs add up to: in use if any address through them is. */
  group?: { inUse: boolean; standby: boolean };
  labelOnly?: boolean;
};
type AliasEdge = Edge<AliasData, "alias">;

/**
 * One address the service advertises, as its own line from this computer to
 * the hub. The colour says how that attempt went; what it ran into is on
 * hover (and on focus, and read out), because three error strings side by
 * side would bury the picture. A relayed line that works is yellow, not
 * green: it gets there, the long way round.
 */
const Alias = ({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<AliasEdge>) => {
  if (!data) return null;
  const { path, offset, leg } = data;
  const said = path.error ?? STATE_LABEL[path.state];
  // A status mark only where there is a status: a spare road, or one nobody
  // has tested, gets no empty circle to look at.
  const mark = path.standby || path.state === "unknown" ? null : STATE_ICON[path.state];
  const through = data.wireState ?? path.state;
  const state: PartState = path.relay && through === "ok" ? "warning" : through;

  let d: string;
  let label: { x: number; y: number };
  if (leg) {
    // Straight down to the relay and straight back up; the address rides on
    // the relay it goes through.
    [d] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    label = { x: targetX + RELAY.width / 2, y: targetY - RELAY.height / 2 - 13 - (data.stack ?? 0) * RELAY_LABEL };
  } else {
    const reach = (targetX - sourceX) / 3;
    d = `M ${sourceX},${sourceY} C ${sourceX + reach},${sourceY + offset} ${targetX - reach},${targetY + offset} ${targetX},${targetY}`;
    // Where a cubic with both controls `offset` away sits at its middle.
    label = { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 + offset * 0.75 };
  }

  return (
    <>
      {!data.labelOnly && (
        <BaseEdge id={id} path={d} interactionWidth={16} {...aliasWire(path, state, data.group)} />
      )}
      {leg !== "from-relay" && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute"
            style={{ transform: `translate(-50%, -50%) translate(${label.x}px, ${label.y}px)`, pointerEvents: "all" }}
            data-alias={path.label}
            data-state={path.state}
            data-lane={path.lane}
            data-use={path.inUse ? "in-use" : path.standby ? "standby" : undefined}
          >
            <Hover
              trigger={
                  <button
                    type="button"
                    className={cn(
                      "flex cursor-default items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 shadow-sm focus-visible:outline-1",
                      leg ? "max-w-60" : "max-w-72",
                    )}
                  >
                    {mark}
                    <span className="sr-only">
                      {path.inUse ? "in use" : path.standby ? `not in use, ${STATE_LABEL[path.state]}` : STATE_LABEL[path.state]}
                    </span>
                    <span
                      className={cn(
                        "truncate font-mono text-[10px]",
                        path.inUse ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {path.label}
                    </span>
                    {path.lane === "mesh" && <MeshMark path={path} />}
                    {path.tunnel && (
                      <span className="shrink-0 rounded-full bg-muted px-1.5 text-[9px] leading-4 text-muted-foreground">
                        {path.tunnel}
                      </span>
                    )}
                    {path.error && <span className="sr-only">{path.error}</span>}
                  </button>
              }
              title={path.label}
              subtitle={path.inUse ? "in use" : path.standby ? "not in use" : STATE_LABEL[path.state]}
              icon={mark}
            >
              <div className="space-y-1">
                <p className="font-mono text-xs break-all">{path.url}</p>
                {path.travel && <p className="text-xs text-muted-foreground">{path.travel}</p>}
                <p className={cn("text-xs", path.state === "failed" && !path.standby ? "text-destructive" : "text-muted-foreground")}>
                  {said}
                </p>
                {path.relay && <p className="text-xs text-amber-600 dark:text-amber-400">{RELAY_NOTE}</p>}
              </div>
            </Hover>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const NODE_TYPES = { tile: Tile, note: Note, relay: Relay };
const EDGE_TYPES = { link: Link, alias: Alias };

/* ──────────────────────────────── layout ──────────────────────────────── */

type AnyNode = TileNode | NoteNode | RelayNode;

const layout = (diagram: Diagram): { nodes: AnyNode[]; edges: (LinkEdge | AliasEdge)[]; height: number } => {
  const aliases = diagram.serviceLink.aliases;
  // One slot per line, with a wider step where the direct lane ends and the
  // mesh lane begins, the whole stack centred on the level.
  // Relayed lines leave the fan: they go down to their relay and back up.
  const straight = aliases.filter((path) => !path.relay);
  const relayed = aliases.filter((path) => path.relay);
  const firstMesh = straight.findIndex((path) => path.lane === "mesh");
  const split = firstMesh > 0 ? LANE_GAP : 0;
  const slots = straight.map((_, index) => index * FAN + (split && index >= firstMesh ? split : 0));
  const middle = slots.length > 0 ? slots[slots.length - 1] / 2 : 0;
  const offsets = new Map(straight.map((path, index) => [path.id, slots[index] - middle]));
  const lowest = middle * 0.75;
  // One relay per DERP region: every address relayed through it shares the
  // node and its two legs. The row starts clear of the lowest direct line and
  // of the hub, each relay leaving room above it for its addresses.
  const regions = new Map<string, AliasPath[]>();
  for (const path of relayed) regions.set(path.relay ?? "", [...(regions.get(path.relay ?? "") ?? []), path]);
  let cursor = LEVEL + Math.max(lowest + 18, HUB.height / 2) + 16;
  const relays = [...regions.entries()].map(([region, paths]) => {
    const y = cursor + paths.length * RELAY_LABEL + 8;
    cursor = y + RELAY.height + 10;
    return { region, paths, y };
  });
  const noteY = relays.length > 0 ? cursor + 4 : LEVEL + Math.max(lowest, 0) + 22;
  const ask = !!diagram.serviceLink.askTailscale;
  const note = { width: NOTE.width, height: NOTE.height + (ask ? ASK : 0) };
  const fixed = { draggable: false, selectable: false, connectable: false, focusable: false };

  const tile = (id: string, x: number, y: number, size: typeof TILE, data: TileData): TileNode => ({
    id,
    type: "tile",
    position: { x, y },
    ...size,
    handles: data.handles.map((spec) => ({ ...spec, width: 0, height: 0 })),
    data,
    ...fixed,
  });

  const nodes: AnyNode[] = [
    tile("coordination", (WIDTH - TILE.width) / 2, 0, TILE, {
      partId: "coordination",
      part: diagram.coordination,
      icon: "coordination",
      handles: [
        handle("client", "target", Position.Bottom, TILE.width * 0.25, TILE.height),
        handle("hub", "target", Position.Bottom, TILE.width * 0.75, TILE.height),
      ],
    }),
    tile("client", 0, LEVEL - TILE.height / 2, TILE, {
      partId: "client",
      part: diagram.client,
      icon: "client",
      handles: [
        handle("coordination", "source", Position.Top, TILE.width / 2, 0),
        handle("hub", "source", Position.Right, TILE.width, TILE.height / 2),
        handle("relay", "source", Position.Bottom, TILE.width * 0.7, TILE.height),
      ],
    }),
    tile("hub", WIDTH - HUB.width, LEVEL - HUB.height / 2, HUB, {
      partId: "hub",
      part: diagram.hub,
      icon: "hub",
      service: diagram.service,
      handles: [
        handle("coordination", "source", Position.Top, HUB.width / 2, 0),
        handle("client", "target", Position.Left, 0, HUB.height / 2),
        handle("relay", "target", Position.Bottom, HUB.width * 0.3, HUB.height),
      ],
    }),
    {
      id: "serviceLink",
      type: "note",
      position: { x: (WIDTH - note.width) / 2, y: noteY },
      ...note,
      data: { part: diagram.serviceLink, via: diagram.serviceLink.via, ask },
      ...fixed,
    },
  ];

  const still = { selectable: false, focusable: false };
  const edges: (LinkEdge | AliasEdge)[] = [
    {
      id: "signInLink",
      type: "link",
      source: "client",
      sourceHandle: "coordination",
      target: "coordination",
      targetHandle: "client",
      data: { partId: "signInLink", part: diagram.signInLink, between: "This computer to the coordination server" },
      ...still,
    },
    {
      id: "reportLink",
      type: "link",
      source: "hub",
      sourceHandle: "coordination",
      target: "coordination",
      targetHandle: "hub",
      data: { partId: "reportLink", part: diagram.reportLink, between: "Hub to the coordination server" },
      ...still,
    },
  ];
  if (aliases.length > 0) {
    straight.forEach((path) =>
      edges.push({
        id: `alias:${path.id}`,
        type: "alias",
        source: "client",
        sourceHandle: "hub",
        target: "hub",
        targetHandle: "client",
        data: { path, offset: offsets.get(path.id) ?? 0 },
        ...still,
      }),
    );
    // Each relay is a stop of its own, underneath: this computer → down to
    // the relay → up to the hub.
    relays.forEach(({ region, paths, y }) => {
      const relayId = `relay:${region}`;
      // The legs work if any address gets through them.
      const wireState: PartState = paths.some((path) => path.state === "ok")
        ? "ok"
        : paths.every((path) => path.state === "failed")
          ? "failed"
          : paths[0].state;
      const group = {
        inUse: paths.some((path) => path.inUse),
        standby: paths.every((path) => path.standby),
      };
      nodes.push({
        id: relayId,
        type: "relay",
        position: { x: (WIDTH - RELAY.width) / 2, y },
        ...RELAY,
        handles: [
          { id: "in", type: "target", position: Position.Left, x: 0, y: RELAY.height / 2, width: 0, height: 0 },
          { id: "out", type: "source", position: Position.Right, x: RELAY.width, y: RELAY.height / 2, width: 0, height: 0 },
        ],
        data: { region, standby: group.standby, failed: wireState === "failed" },
        ...fixed,
      });
      paths.forEach((path, stack) =>
        edges.push({
          id: `alias:${path.id}`,
          type: "alias",
          source: "client",
          sourceHandle: "relay",
          target: relayId,
          targetHandle: "in",
          data: { path, offset: 0, leg: "to-relay", stack, wireState, group, labelOnly: stack > 0 },
          ...still,
        }),
      );
      edges.push({
        id: `relay:${region}:hub`,
        type: "alias",
        source: relayId,
        sourceHandle: "out",
        target: "hub",
        targetHandle: "relay",
        data: { path: paths[0], offset: 0, leg: "from-relay", wireState, group },
        ...still,
      });
    });
  } else {
    // No address to draw (a service that is not offered): one faint line
    // stands in, and the note under it says what it means.
    edges.push({
      id: "serviceLink",
      type: "link",
      source: "client",
      sourceHandle: "hub",
      target: "hub",
      targetHandle: "client",
      data: { partId: "serviceLink", part: diagram.serviceLink, between: "This computer to the hub", bare: true },
      ...still,
    });
  }

  return { nodes, edges, height: Math.max(noteY + note.height, LEVEL + HUB.height / 2) + 8 };
};

const FIT = { padding: 0.02, maxZoom: 1 };

/**
 * Keep the whole picture in view: when the tab changes size, when the picture
 * does (an address more, a relay, the question), and once its nodes are in.
 * On the next frame, because the store takes the new nodes a tick after the
 * props change, and fitting before that fits the OLD picture.
 */
const Refit = ({ signature }: { signature: string }) => {
  const { fitView } = useReactFlow();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const ready = useNodesInitialized();
  useEffect(() => {
    if (!ready || width === 0 || height === 0) return;
    const frame = requestAnimationFrame(() => void fitView(FIT));
    return () => cancelAnimationFrame(frame);
  }, [fitView, width, height, signature, ready]);
  return null;
};

export const ConnectionDiagram = ({
  diagram,
  pending,
  renderFindings,
  onTailscaleAnswer,
  className,
}: {
  diagram: Diagram;
  /**
   * Still being tested: the picture waits, in the room it will take, rather
   * than show a half-checked connection that changes under the reader.
   */
  pending?: boolean;
  /**
   * Called with the user's answer to "run `tailscale status`?". Without it the
   * diagram does not ask, and an unexplained mesh address stays unexplained.
   */
  onTailscaleAnswer?: (allow: boolean, remember: boolean) => void;
  /** The doctor panel's own finding rows, so a part's findings read like every other. */
  renderFindings?: (findings: Finding[]) => ReactNode;
  className?: string;
}) => {
  const [open, setOpen] = useState<DiagramPartId | undefined>();
  // Without a renderer there is nothing to expand into, so nothing is a button.
  const expands = !!renderFindings;
  const toggle = useMemo<Toggle>(
    () => ({
      open,
      onToggle: expands ? (id) => setOpen((current) => (current === id ? undefined : id)) : undefined,
      onTailscaleAnswer,
    }),
    [open, expands, onTailscaleAnswer],
  );
  const { nodes, edges, height } = useMemo(() => layout(diagram), [diagram]);
  const opened = open ? diagram[open] : undefined;

  if (pending) {
    return (
      <section aria-label="Connection diagram" aria-busy className={cn("w-full", className)}>
        <div
          className="mx-auto flex w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
          style={{ maxWidth: WIDTH, aspectRatio: `${WIDTH} / ${height}` }}
        >
          <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
          <span>Diagnosing…</span>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Connection diagram" className={cn("w-full", className)}>
      <div className="mx-auto w-full" style={{ maxWidth: WIDTH, aspectRatio: `${WIDTH} / ${height}` }}>
        <ToggleContext.Provider value={toggle}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            fitView
            fitViewOptions={FIT}
            minZoom={0.2}
            maxZoom={FIT.maxZoom}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable={false}
            edgesFocusable={false}
            elementsSelectable={false}
            panOnDrag={false}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            proOptions={{ hideAttribution: true }}
            style={{ background: "transparent" }}
          >
            <Refit signature={`${nodes.map((node) => node.id).join()}:${edges.length}:${height}`} />
          </ReactFlow>
        </ToggleContext.Provider>
      </div>

      {opened && opened.findings.length > 0 && renderFindings && (
        <div role="region" aria-label={`Findings: ${opened.label}`} className="mx-auto mt-2 w-full max-w-2xl text-left">
          {renderFindings(opened.findings)}
        </div>
      )}
    </section>
  );
};
