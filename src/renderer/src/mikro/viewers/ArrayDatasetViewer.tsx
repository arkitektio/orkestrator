import { useState } from "react";

import type { ViewerWidgetProps } from "@/core/smart/display/registry";
import { cn } from "@/core/util/utils";
import { useGetArrayDatasetQuery, useGetSceneQuery } from "../api/graphql";
import { DatasetBackdrop } from "../components/arraydataset/DatasetBackdrop";
import { EmbeddedScene, ViewerNotice } from "./EmbeddedScene";

/**
 * The viewer for `@mikro/arraydataset`: the scene the dataset page would open
 * (see ArrayDatasetPage) — the one it nominates, else its first. A dataset
 * with no scene gets the page's own "create scene" backdrop: a viewer does not
 * create one by being looked at.
 */
const ArrayDatasetViewer = ({ id, controls, className }: ViewerWidgetProps) => {
  const [selectedSceneId, setSelectedSceneId] = useState<string>();
  const { data, loading, error } = useGetArrayDatasetQuery({ variables: { id } });
  const dataset = data?.arrayDataset;

  const activeSceneId = selectedSceneId ?? dataset?.defaultScene?.id ?? dataset?.scenes.at(0)?.id;

  const { data: sceneData } = useGetSceneQuery({
    variables: { id: activeSceneId as string },
    skip: !activeSceneId,
    errorPolicy: "all",
  });

  if (!dataset) {
    return (
      <ViewerNotice className={className}>
        {loading ? "Loading dataset…" : (error?.message ?? "This dataset could not be loaded.")}
      </ViewerNotice>
    );
  }
  if (sceneData?.scene) {
    return <EmbeddedScene scene={sceneData.scene} controls={controls} className={className} />;
  }
  if (activeSceneId) return <ViewerNotice className={className}>Loading scene…</ViewerNotice>;
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <DatasetBackdrop dataset={dataset} onSceneCreated={setSelectedSceneId} />
    </div>
  );
};

export default ArrayDatasetViewer;
