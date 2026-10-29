import { useDialog } from "@/core/dialogs/registry";
import type { LightpathGraphFragment } from "@/mikro/api/graphql";
import { LightPathSchematic } from "./LightPathSchematic";

/** The schematic as a panel shows it: a click opens the one in 3D. */
export const LightPathSpoke = ({
  graph,
  title,
}: {
  graph: LightpathGraphFragment;
  title?: string;
}) => {
  const { openDialog } = useDialog();
  return (
    <LightPathSchematic
      graph={graph}
      onExpand={() => openDialog("lightpath3d", { graph, title }, { size: "large" })}
    />
  );
};
