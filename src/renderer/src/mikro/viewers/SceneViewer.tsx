import type { ViewerWidgetProps } from "@/core/smart/display/registry";
import { useGetSceneQuery } from "../api/graphql";
import { EmbeddedScene, ViewerNotice } from "./EmbeddedScene";

/** The viewer for `@mikro/scene`. */
const SceneViewer = ({ id, controls, className }: ViewerWidgetProps) => {
  const { data, loading, error } = useGetSceneQuery({
    variables: { id },
    // See ScenePage: a layer whose `asAffine` cannot condense must null that
    // one field, not discard the scene.
    errorPolicy: "all",
  });

  if (data?.scene) return <EmbeddedScene scene={data.scene} controls={controls} className={className} />;
  if (loading) return <ViewerNotice className={className}>Loading scene…</ViewerNotice>;
  return <ViewerNotice className={className}>{error?.message ?? "This scene could not be loaded."}</ViewerNotice>;
};

export default SceneViewer;
