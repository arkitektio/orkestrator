import { NodeProps } from "@xyflow/react";
import CircleNode from "./CircleNode";
import { RESIDENT_DIAMETER } from "./nodeSize";
import { RESIDENT_ICON, RESIDENT_KIND_LABEL, ResidentLink } from "./ResidentLink";
import { residentName } from "./residents";
import { ResidentNode as TNode } from "./types";

/**
 * A resident as its own node.
 *
 * `residents` is the whole vocabulary a coordinate system has left now that
 * `kind` is gone, so who lives in a space is structure, not a caption: the
 * dataset hangs off the grid it lives in, and a space with nothing hanging off
 * it IS the reference frame.
 *
 * Drawn as a SMALL SOLID DISC against the spaces' large hollow rings. The chart
 * ramp is one hue at five lightness steps, so colour alone could never say
 * "this is a different kind of thing" — form has to. Half the diameter and a
 * filled body reads as data sitting inside a place at any zoom, and it keeps the
 * transformation chain between the spaces the first thing the eye follows.
 */
export const RESIDENT_SWATCH = "h-2 w-2 rounded-full bg-chart-5";

export const ResidentNode = ({ data }: NodeProps<TNode>) => {
  const { resident } = data;
  const kind = RESIDENT_KIND_LABEL[resident.__typename];

  return (
    <CircleNode
      icon={RESIDENT_ICON[resident.__typename]}
      title={`${residentName(resident)}\n${kind}`}
      diameter={RESIDENT_DIAMETER}
      // Solid, borderless, and ringed in the page's own colour so the disc stays
      // separate from an edge terminating under it.
      className="border-0 bg-chart-5 ring-2 ring-background"
      // Against a filled disc the icon has to invert: `background` is white in
      // the light theme and black in the dark one, and chart-5 is the ramp's
      // darkest step in both — so this reads either way without a `dark:` twin.
      iconClassName="text-background"
      caption={kind}
    >
      <ResidentLink resident={resident} />
    </CircleNode>
  );
};

export default ResidentNode;
