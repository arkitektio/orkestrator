import { linkBuilder } from "@/core/smart/builder";
import { useAutoVisualizeMutation, type AutoVisualizeMutation } from "@/mikro/api/graphql";
import { useNavigate } from "react-router-dom";
import { toast } from "@/core/notify";

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

/**
 * Show one lens from a page that draws scenes itself. A scene is handed to
 * `onScene` once the page's own queries hold it; a chart has a page of its
 * own, so that is where it opens. A refusal is the server's prose, as a toast.
 */
export const useVisualizeLens = (onScene: (sceneId: string) => void) => {
  const navigate = useNavigate();
  const [mutate, { loading }] = useAutoVisualizeMutation({
    // Awaited, so `onScene` never names a scene the page cannot find yet.
    refetchQueries: ["GetLens", "GetArrayDataset"],
    awaitRefetchQueries: true,
    onCompleted: ({ autoVisualize }) =>
      autoVisualize.__typename === "Chart"
        ? navigate(visualizationLink(autoVisualize))
        : onScene(autoVisualize.id),
    onError: (error) => toast.error(error.message),
  });
  const visualize = (lens: string) => mutate({ variables: { input: { lens } } });
  return [visualize, loading] as const;
};
