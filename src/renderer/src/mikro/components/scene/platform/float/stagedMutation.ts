import { useCallback } from "react";
import type { DocumentNode } from "graphql";

import { isStagedLayerId, useOptionalStagedLayersStoreApi, type StagedEdit } from "./stagedLayerStore";

// `never[]`: any generated mutate function fits, whatever its variables.
type MutateLike = (...args: never[]) => Promise<unknown>;

/**
 * A layer card's update mutation that knows about STAGED layers: a write whose
 * `input.id` is a staged layer's (`staged:…`, no server row) is held on the
 * staged entry instead of sent, and resolves with no data — every card reads
 * its answer as optional and keeps its local patch. Keeping the layer replays
 * the held writes, in order, against the saved one (`keepPreviewLayer`), so
 * what was tuned while staged is what is kept.
 *
 * Wraps the generated hook's tuple: `useStagedLayerMutation(useUpdateXMutation(), UpdateXDocument)`.
 * Every write a layer card makes goes through one of these.
 */
export function useStagedLayerMutation<T extends readonly [MutateLike, ...unknown[]]>(tuple: T, document: DocumentNode): T {
  const stagedApi = useOptionalStagedLayersStoreApi();
  const [mutate, ...rest] = tuple;
  const staged = useCallback(
    (options?: { variables?: unknown }) => {
      const variables = options?.variables as StagedEdit["variables"] | undefined;
      const id = variables?.input?.id;
      if (stagedApi && variables && id && isStagedLayerId(id)) {
        stagedApi.getState().recordEdit(id, { document, variables });
        return Promise.resolve({ data: undefined });
      }
      return (mutate as unknown as (options?: { variables?: unknown }) => Promise<unknown>)(options);
    },
    [stagedApi, mutate, document],
  );
  return [staged, ...rest] as unknown as T;
}
