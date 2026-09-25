import { MikroCoordinateSystem } from "@/linkers";
import { NodeProps } from "@xyflow/react";
import { Boxes, Globe } from "lucide-react";
import CircleNode from "./CircleNode";
import { isReferenceFrame, occupancyLabel } from "./residents";
import { CoordinateSystemNode as TNode } from "./types";

// Inhabited vs. uninhabited is the whole vocabulary the graph has left, and
// colour is the fastest way to read a component: which spaces hold data, and
// which is the pure frame the rest are registered into.
//
// The app's chart ramp rather than picked Tailwind hues, so the graph is
// coloured by the same palette as everything else that visualises data. The
// ramp is a LIGHTNESS ladder of one hue, not a categorical set, so hue is not
// available to say what a thing IS — that is carried by FORM instead: a
// coordinate system is a large ring with a shell inside it and its name in the
// middle, a resident is a small solid disc (`ResidentNode`). Within the spaces,
// the ramp's ends separate the two occupancies — frame (1), inhabited (3) — and
// they flip with the theme on their own, which the fixed `-500` shades and their
// `dark:` overrides had to do by hand.

// The concentric hairline inside the border: a coordinate system is a bounded
// space, and nothing else in this graph wears a second ring. Drawn inside so it
// never collides with the root's `ring-2 ring-primary` on the outside.
const SHELL =
  "after:pointer-events-none after:absolute after:inset-[5px] after:rounded-full after:border after:content-['']";

// A node's fill is OPAQUE, never a tint with alpha in it.
//
// Every edge is aimed at the CENTRE of the node it ends in — that is what
// `NodeHandles` collapses them to — so a see-through body lets the line, its
// arrowhead and the background grid shimmer through the middle of the very
// space they are supposed to terminate in. Mixing the ramp colour INTO
// `--background` gives exactly the wash a `/50` gave, as a solid colour: the
// same mechanism Tailwind's own opacity modifier compiles to, with the page's
// background where `transparent` used to be. The percentage is the dial —
// it reads like the old alpha, and nothing behind it comes through.
const FILL = {
  frame: "bg-[color-mix(in_oklab,var(--chart-1)_50%,var(--background))]",
  inhabited: "bg-[color-mix(in_oklab,var(--chart-3)_20%,var(--background))]",
} as const;

const OCCUPANCY_RING = {
  // The dashed shell inside: nothing lives in a frame, and the broken inner
  // ring says so before the colour does.
  frame: `border-[3px] border-chart-1/80 ${FILL.frame} after:border-dashed after:border-chart-1/30 ${SHELL}`,
  // Solid through and through: this space holds something.
  inhabited: `border-[3px] border-chart-3/80 ${FILL.inhabited} after:border-chart-3/30 ${SHELL}`,
} as const;

// The legend's swatch: the node in miniature — same border, same colour — but
// carrying its fill at full strength, because a 12px dot cannot show a wash.
export const OCCUPANCY_SWATCH = {
  frame: "h-3 w-3 rounded-full border-2 border-chart-1/80 bg-chart-1/90",
  inhabited: "h-3 w-3 rounded-full border-2 border-chart-3/80 bg-chart-3/90",
} as const;

export const OCCUPANCY_LABEL = {
  frame: "reference frame",
  inhabited: "inhabited",
} as const;

const OCCUPANCY_TEXT = {
  frame: "text-chart-1",
  inhabited: "text-chart-3",
} as const;

const OCCUPANCY_ICON = {
  frame: Globe,
  inhabited: Boxes,
} as const;

const OCCUPANCY_TITLE = {
  frame:
    "Nothing lives in this space. Sources register into it and scenes adopt it as their world; it outlives every scene over it.",
  inhabited: "The data living in this space.",
} as const;

export type Occupancy = keyof typeof OCCUPANCY_SWATCH;

export const CoordinateSystemNode = ({ data }: NodeProps<TNode>) => {
  const { system, isRoot } = data;
  const occupancy: Occupancy = isReferenceFrame(system) ? "frame" : "inhabited";

  // The axes do not fit in a circle and are not what distinguishes one space
  // from another at a glance — the name and who lives there are. They stay on
  // the hover, in their declared order.
  const axes = [...system.axes]
    .sort((a, b) => a.order - b.order)
    .map((axis) => `${axis.name}${axis.unit ? ` (${axis.unit})` : ""}`)
    .join(" · ");

  return (
    <CircleNode
      icon={OCCUPANCY_ICON[occupancy]}
      title={`${system.name}\n${occupancyLabel(system)}\n${axes}\n\n${OCCUPANCY_TITLE[occupancy]}`}
      className={OCCUPANCY_RING[occupancy]}
      iconClassName={OCCUPANCY_TEXT[occupancy]}
      emphasised={isRoot}
      caption={system.axes
        .map((axis) => axis.name)
        .slice(0, 5)
        .join("")}
    >
      <MikroCoordinateSystem.DetailLink object={system}>
        {system.name}
      </MikroCoordinateSystem.DetailLink>
    </CircleNode>
  );
};

export default CoordinateSystemNode;
