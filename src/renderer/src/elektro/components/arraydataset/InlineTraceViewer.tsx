import type { ApolloClient, ApolloError, NormalizedCache } from "@apollo/client";
import { useEffect, useState } from "react";
import { useElektro } from "@/app/Arkitekt";
import { ElektroArrayDataset } from "@/linkers";
import { useGetExperimentSceneQuery } from "../../api/graphql";
import { findOrCreateExperimentForWorld } from "../../lib/openOnTimeline";
import { ExperimentScene } from "../experiment/ExperimentScene";

/**
 * One trace drawn inline, in a small timeline inside whatever opened it (a
 * neuron section's popout, as its card's `aside`). Frameless: the host card is
 * the surface.
 *
 * Drawn through the experiment over the dataset's OWN grid — placement is the
 * server's (`asAffine`), so there is no drawing without an experiment, and the
 * grid's is the one that holds this dataset alone. Found if one exists, staged
 * if not (`findOrCreateExperimentForWorld`, what "Create experiment → Its own
 * grid" on the dataset page makes), so opening it again reuses it.
 *
 * Read-only and self-contained: `annotatable={false}` and the mini viewport,
 * which writes nothing into the host page's URL and binds no window keys.
 */
export const InlineTraceViewer = ({
  dataset,
}: {
  dataset: { id: string; name: string; intrinsicSystem?: { id: string } | null };
}) => {
  const client = useElektro() as ApolloClient<NormalizedCache> | undefined;
  const gridId = dataset.intrinsicSystem?.id;
  const [experimentId, setExperimentId] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!client || !gridId) return;
    let cancelled = false;
    setExperimentId(null);
    setFailure(null);
    findOrCreateExperimentForWorld(client, gridId, dataset.name)
      .then((id) => !cancelled && setExperimentId(id))
      .catch((error: unknown) => {
        if (!cancelled) setFailure(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [client, gridId, dataset.name]);

  // `errorPolicy: "all"` as on the experiment page: a lookup-timed layer nulls
  // its own `asAffine` with an error, which the renderer reads.
  const { data, error } = useGetExperimentSceneQuery({
    variables: { id: experimentId as string },
    skip: !experimentId,
    errorPolicy: "all",
  });

  const message = !gridId
    ? "This dataset has no grid to draw it on."
    : failure
      ? `Could not open the trace: ${failure}`
      : !data?.experiment
        ? "Loading…"
        : null;

  return (
    <div className="flex h-64 w-[28rem] flex-col gap-1.5">
      <ElektroArrayDataset.DetailLink
        object={dataset}
        className="shrink-0 truncate text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        {dataset.name}
      </ElektroArrayDataset.DetailLink>
      <div className="min-h-0 flex-1 overflow-hidden rounded-md">
        {message ? (
          <div className="flex h-full items-center justify-center bg-black p-4 text-center text-muted-foreground">
            {message}
          </div>
        ) : (
          <ExperimentScene.Provider
            experiment={data?.experiment}
            annotatable={false}
            placementErrors={(error as ApolloError | undefined)?.graphQLErrors}
          >
            <ExperimentScene.MiniViewport />
          </ExperimentScene.Provider>
        )}
      </div>
    </div>
  );
};
