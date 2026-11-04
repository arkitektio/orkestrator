import { useCallback, useRef, type ReactNode } from "react";

import { reportError, toast } from "@/core/notify";
import { SmartResultSink, resultOriginKey, type ResultOrigin } from "@/core/smart/extensions/results";
import { uniqueStructures } from "@/core/smart/structure";
import type { Structure } from "@/core/types";
import { useMikro } from "@/mikro/api/funcs";
import { LENS_KINDS } from "@/mikro/lenses";

import { useStagedLayersStoreApi } from "../../platform/float/stagedLayerStore";
import { useStaging, type StageSource } from "./useStaging";

const ARRAY_LENS = LENS_KINDS.ArrayLens.identifier;
const MESH_LENS = LENS_KINDS.MeshLens.identifier;
const ANNOTATION = "@mikro/annotation";

/**
 * What a float's actions return goes HERE, not to the scene's sink
 * (`features/results/SceneResultSink`): the innermost sink wins, so a lens an
 * action run from the float made — a crop, a straightened image, a surface —
 * is STAGED, owned by the float, instead of becoming a saved layer. The float
 * then asks to keep or discard it.
 *
 * A rerun of the same action on the same objects replaces what its previous
 * run staged: tuning an action from the float leaves one result. Nothing on
 * the server is undone by that — only the staged layer goes.
 *
 * A returned shape (a refined path) lives in a collection the scene already
 * shows, so it is refetched, as the scene's sink does.
 */
export const StagingResultSink = ({ owner, children }: { owner: string; children?: ReactNode }) => {
  const client = useMikro();
  const { stage } = useStaging();
  const stagedApi = useStagedLayersStoreApi();
  const queue = useRef<Promise<void>>(Promise.resolve());

  const onResults = useCallback(
    (results: Structure[], origin?: ResultOrigin) => {
      const sources: StageSource[] = [
        ...uniqueStructures(results.filter((result) => result.identifier === ARRAY_LENS)).map(
          (lens): StageSource => ({ kind: "array", lens: lens.id, label: lens.label }),
        ),
        ...uniqueStructures(results.filter((result) => result.identifier === MESH_LENS)).map(
          (lens): StageSource => ({ kind: "mesh", lens: lens.id, label: lens.label }),
        ),
      ];
      const annotations = results.some((result) => result.identifier === ANNOTATION);
      const originKey = origin ? resultOriginKey(origin) : undefined;

      queue.current = queue.current.then(async () => {
        const staged: string[] = [];
        let unplaceable = 0;
        for (const source of sources) {
          try {
            const result = await stage(owner, source, originKey);
            if (result.status === "staged") staged.push(result.key);
            if (result.status === "unplaceable") unplaceable++;
          } catch (error) {
            reportError(error, "Couldn't stage the result in the scene");
          }
        }
        if (unplaceable > 0) toast.info("The result was made, but cannot be placed in this scene");
        if (annotations) {
          await client.refetchQueries({ include: ["GetSceneAnnotations"] }).catch((error: unknown) => {
            reportError(error, "Couldn't show the returned shape");
          });
        }
        // A rerun replaces this owner's layers from the previous run.
        if (originKey && staged.length > 0) {
          const stale = stagedApi
            .getState()
            .entries.filter((entry) => entry.owner === owner && entry.origin === originKey && !staged.includes(entry.key))
            .map((entry) => entry.key);
          stagedApi.getState().discard(stale);
        }
      });
    },
    [client, owner, stage, stagedApi],
  );

  return <SmartResultSink onResults={onResults}>{children}</SmartResultSink>;
};
