import { Grid3x3 } from "lucide-react";
import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { useGetListGridQuery } from "../api/graphql";
import { gridAxesLabel } from "../gridAxes";

/** `@mikro/grid` elsewhere: its name and its rows and columns. */
export const GridDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetListGridQuery({ variables: { id: props.id } });
  const grid = data?.grid;
  if (!grid) return <DisplayLinePlaceholder {...props} icon={Grid3x3} />;
  return <DisplayLine {...props} icon={Grid3x3} title={grid.name} meta={[gridAxesLabel(grid)]} />;
};
