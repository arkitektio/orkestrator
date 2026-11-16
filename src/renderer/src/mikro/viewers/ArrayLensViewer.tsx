import { useState } from "react";

import type { ViewerWidgetProps } from "@/core/smart/display/registry";
import { cn } from "@/core/util/utils";
import { useGetArrayDatasetQuery, useGetLensQuery, useGetSceneQuery } from "../api/graphql";
import { DatasetBackdrop } from "../components/arraydataset/DatasetBackdrop";
import type { ArrayDetailLens } from "../lenses";
import ArrayDatasetViewer from "./ArrayDatasetViewer";
import { EmbeddedScene, ViewerNotice } from "./EmbeddedScene";

/**
 * The viewer for `@mikro/arraylens`, by the lens page's rules (see LensPage,
 * LensWorkspace): the whole array has one address, so a lens that cuts nothing
 * opens as its dataset; a cut opens the scene it nominates when that scene
 * draws it, else the first scene that does. A cut no scene draws gets the
 * page's "create scene" backdrop: a viewer does not create one by being looked at.
 */
const ArrayLensViewer = ({ id, controls, className, ...rest }: ViewerWidgetProps) => {
  const { data, loading, error } = useGetLensQuery({ variables: { id } });
  const lens = data?.lens;

  if (!lens) {
    return (
      <ViewerNotice className={className}>
        {loading ? "Loading lens…" : (error?.message ?? "This lens could not be loaded.")}
      </ViewerNotice>
    );
  }
  if (lens.__typename !== "ArrayLens") {
    return <ViewerNotice className={className}>This lens is not an array lens.</ViewerNotice>;
  }
  if (lens.slices.length === 0) {
    return (
      <ArrayDatasetViewer
        {...rest}
        identifier="@mikro/arraydataset"
        id={lens.dataset.id}
        controls={controls}
        className={className}
      />
    );
  }
  return <SlicedLensViewer lens={lens} controls={controls} className={className} />;
};

const SlicedLensViewer = ({
  lens,
  controls,
  className,
}: {
  lens: ArrayDetailLens;
  controls?: boolean;
  className?: string;
}) => {
  const [selectedSceneId, setSelectedSceneId] = useState<string>();

  // A cut that nominates nothing answers with its dataset's nomination; only a
  // scene that actually draws the cut is one to land on.
  const nominated = lens.scenes.find((scene) => scene.id === lens.defaultScene?.id)?.id;
  const activeSceneId = selectedSceneId ?? nominated ?? lens.scenes.at(0)?.id;

  const { data: sceneData } = useGetSceneQuery({
    variables: { id: activeSceneId as string },
    skip: !activeSceneId,
    errorPolicy: "all",
  });

  if (sceneData?.scene) {
    return <EmbeddedScene scene={sceneData.scene} controls={controls} className={className} />;
  }
  if (activeSceneId) return <ViewerNotice className={className}>Loading scene…</ViewerNotice>;
  return <LensBackdropPane lens={lens} className={className} onSceneCreated={setSelectedSceneId} />;
};

/** The backdrop needs the dataset (its pyramid, its spaces); read only when no scene draws the cut. */
const LensBackdropPane = ({
  lens,
  className,
  onSceneCreated,
}: {
  lens: ArrayDetailLens;
  className?: string;
  onSceneCreated: (sceneId: string) => void;
}) => {
  const { data, loading, error } = useGetArrayDatasetQuery({ variables: { id: lens.dataset.id } });
  const dataset = data?.arrayDataset;

  if (!dataset) {
    return (
      <ViewerNotice className={className}>
        {loading ? "Loading dataset…" : (error?.message ?? "This lens' dataset could not be loaded.")}
      </ViewerNotice>
    );
  }
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <DatasetBackdrop dataset={dataset} lens={lens} onSceneCreated={onSceneCreated} />
    </div>
  );
};

export default ArrayLensViewer;
