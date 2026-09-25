import type { ApolloError } from "@apollo/client";
import { useCallback, useMemo, useState } from "react";
import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { ElektroArrayDataset } from "@/core/linkers";
import { useGetArrayDatasetQuery, useGetExperimentSceneQuery } from "../api/graphql";
import { DatasetBackdrop } from "../components/arraydataset/DatasetBackdrop";
import { DatasetTitleOverlay } from "../components/arraydataset/DatasetTitleOverlay";
import { ExperimentScene } from "../components/experiment/ExperimentScene";
import { DatasetInfoSidebar } from "../components/sidebars/DatasetInfoSidebar";

/**
 * An array dataset, drawn — mikro's `ArrayDatasetPage` with the timeline where
 * mikro has the scene.
 *
 * A dataset is drawn through an EXPERIMENT the way an image is drawn through a
 * scene: placement is the server's (`asAffine`), so there is no timeline without
 * one. The page lands on the first experiment already drawing the dataset (the
 * schema nominates none), with a switcher when there are several; with none, the
 * backdrop offers to compose one over the dataset's own grid or a clock it is
 * registered onto — and the new one is selected in place.
 *
 * The scene query runs with `errorPolicy: "all"` for the same reason
 * `ExperimentPage` does: one lookup-timed layer must null its own `asAffine`,
 * not discard the experiment, and its error is how the renderer tells "timed by
 * a lookup" from "unregistered".
 */
export const ArrayDatasetPage = asDetailQueryRoute(useGetArrayDatasetQuery, ({ data }) => {
  const dataset = data.arrayDataset;
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>();

  // Every experiment drawing the dataset, once — a dataset drawn by three layers
  // of one experiment is in ONE experiment.
  const experiments = useMemo(
    () => [
      ...new Map(
        dataset.experimentLayers.map((layer) => [layer.experiment.id, layer.experiment]),
      ).values(),
    ],
    [dataset.experimentLayers],
  );

  const handleExperimentCreated = useCallback(
    (experimentId: string) => setSelectedExperimentId(experimentId),
    [],
  );

  const activeExperimentId = selectedExperimentId ?? experiments.at(0)?.id;

  // The dataset only carries each experiment's id + name for the switcher; the
  // renderer needs the whole scene, fetched the way ExperimentPage does. Apollo
  // caches it, so switching back is free.
  const {
    data: sceneData,
    loading: sceneLoading,
    error: sceneError,
  } = useGetExperimentSceneQuery({
    variables: { id: activeExperimentId as string },
    skip: !activeExperimentId,
    errorPolicy: "all",
  });
  const experiment = sceneData?.experiment ?? null;

  return (
    // The provider wraps the WHOLE ModelPage so the Layers tab (a sibling of the
    // content area) reaches the experiment's stores. Null = no experiment.
    <ExperimentScene.Provider
      experiment={experiment}
      placementErrors={(sceneError as ApolloError | undefined)?.graphQLErrors}
    >
      <ElektroArrayDataset.ModelPage
        object={dataset}
        title={dataset.name}
        variant="black"
        overlay
        actions={<ElektroArrayDataset.Actions object={dataset} />}
        pageActions={
          <>
            <ElektroArrayDataset.ObjectButton alwaysShow object={dataset} />
          </>
        }
        additionalSidebars={
          <>
            <Sidebars.Tab label="Layers">
              <ExperimentScene.LayersSidebar />
            </Sidebars.Tab>
            <Sidebars.Tab label="Annotations">
              <ExperimentScene.AnnotationsSidebar />
            </Sidebars.Tab>
            <Sidebars.Tab label="Info">
              <DatasetInfoSidebar dataset={dataset} />
            </Sidebars.Tab>
          </>
        }
        defaultSidebar={experiments.length > 0 ? "Layers" : "Info"}
        sidebarKey="ElektroDatasetDetail"
      >
        <div className="flex h-full w-full flex-col">
          <DatasetTitleOverlay
            dataset={dataset}
            experiments={experiments}
            activeExperimentId={activeExperimentId}
            onSelectExperiment={setSelectedExperimentId}
            experimentLoading={sceneLoading}
          />
          <div className="min-h-0 w-full flex-1 overflow-hidden">
            {/* Keyed on the experiment: the renderer builds its stores per
                experiment, so switching must remount, not repopulate. */}
            {experiment ? (
              <ExperimentScene.Viewport key={experiment.id} />
            ) : activeExperimentId ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading experiment…</div>
              </div>
            ) : (
              <DatasetBackdrop dataset={dataset} onExperimentCreated={handleExperimentCreated} />
            )}
          </div>
        </div>
      </ElektroArrayDataset.ModelPage>
    </ExperimentScene.Provider>
  );
});

export default ArrayDatasetPage;
