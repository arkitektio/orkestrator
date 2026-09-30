import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Aperture } from "lucide-react";
import { useGetLensQuery } from "../api/graphql";

/** `@mikro/lens` elsewhere: the dataset it looks into and the window's shape. */
export const LensDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetLensQuery({ variables: { id: props.id } });
  const lens = data?.lens;
  if (!lens) return <DisplayLinePlaceholder {...props} icon={Aperture} />;

  const shape = lens.axisNames.map((axis, index) => `${axis} ${lens.shape[index]}`).join(" × ");
  return (
    <DisplayLine
      {...props}
      icon={Aperture}
      title={`Lens on ${lens.dataset.name}`}
      meta={[shape, lens.coordinateSystem?.name]}
    />
  );
};
