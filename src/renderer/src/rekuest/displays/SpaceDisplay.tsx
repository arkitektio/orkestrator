import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Box } from "lucide-react";
import { useSpaceQuery } from "../api/graphql";

/** `@rekuest/space` elsewhere: its name and how many things are placed in it. */
export const SpaceDisplay = (props: DisplayWidgetProps) => {
  const { data } = useSpaceQuery({ variables: { id: props.id } });
  const space = data?.space;
  if (!space) return <DisplayLinePlaceholder {...props} icon={Box} />;

  return (
    <DisplayLine
      {...props}
      icon={Box}
      title={space.name}
      meta={[countOf(space.placements.length, "placement")]}
    />
  );
};
