import { linkBuilder } from "@/core/smart/builder";
import type { AutoVisualizeMutation } from "@/mikro/api/graphql";

/**
 * Where an `autoVisualize` answer opens. The server chose the kind from the
 * space's axes, so the client only reads which one it got.
 */
export const visualizationLink = (
  visualization: Pick<AutoVisualizeMutation["autoVisualize"], "__typename" | "id">,
): string =>
  visualization.__typename === "Chart"
    ? linkBuilder("mikro/charts")(visualization.id)
    : linkBuilder("mikro/scenes")(visualization.id);
