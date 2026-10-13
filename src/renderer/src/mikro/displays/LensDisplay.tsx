import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Aperture } from "lucide-react";
import { useGetLensQuery } from "../api/graphql";
import { describeLens } from "../lenses";

/** A lens elsewhere: what it is called, the container it looks into and the
 *  part it selects. The icon says which of the six kinds it is.
 *
 *  Registered for `@mikro/lens` and for the six structures a port is typed on
 *  (`@mikro/arraylens`, …). Whichever it was asked for, the line links to the
 *  lens page, which is filed under `@mikro/lens`. */
const LENS_PAGE = "@mikro/lens";

export const LensDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetLensQuery({ variables: { id: props.id } });
  const lens = data?.lens;
  if (!lens) return <DisplayLinePlaceholder {...props} identifier={LENS_PAGE} icon={Aperture} />;

  const { info, title, selection, container } = describeLens(lens);
  return (
    <DisplayLine
      {...props}
      identifier={LENS_PAGE}
      icon={info.icon}
      title={lens.name?.trim() ? title : `${info.label} on ${container.name}`}
      meta={[lens.name?.trim() ? container.name : null, selection, lens.coordinateSystem?.name]}
    />
  );
};
