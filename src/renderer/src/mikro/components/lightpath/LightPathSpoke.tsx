import { useDialog } from "@/core/dialogs/registry";
import type { LightpathGraphFragment } from "@/mikro/api/graphql";
import { LightPathSchematic } from "./LightPathSchematic";

/** The schematic as a panel shows it: a click opens the one in 3D. */
export const LightPathSpoke = ({
  graph,
  title,
  tone,
}: {
  graph: LightpathGraphFragment;
  title?: string;
  tone?: "overlay" | "surface";
}) => {
  const { openDialog } = useDialog();
  return (
    <LightPathSchematic
      graph={graph}
      tone={tone}
      onExpand={() => openDialog("lightpath3d", { graph, title }, { size: "large" })}
    />
  );
};
