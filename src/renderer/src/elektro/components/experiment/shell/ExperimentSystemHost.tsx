import type { ApolloClient, NormalizedCache } from "@apollo/client";
import { useEffect, useRef } from "react";
import { useDatalayerEndpoint, useElektro } from "@/app/Arkitekt";
import {
  GetTableDatasetDocument,
  type GetTableDatasetQuery,
  type GetTableDatasetQueryVariables,
  type ZarrStoreFragment,
} from "@/elektro/api/graphql";
import { useElektroParquetEngine } from "@/elektro/components/store/parquetEngine";
import { elektroSparseAccess } from "@/elektro/components/store/sparseAccess";
import { useElektroZarrStoreApi } from "@/elektro/components/store/zarrStore";
import { blockNnz, openSparseLayout, readSparseBlock } from "@/lib/sparse/sparseReader";
import { createExperimentSystem, type ExperimentDeps, type ExperimentScopeStores } from "./experimentSystem";

/**
 * Hosts the experiment system for one scope: builds it when the scope is ready,
 * disposes it when the scope is rebuilt or the page leaves. Headless — the
 * system's work is all vanilla subscriptions and store writes (P17).
 *
 * Dependencies come from React context (the zarr store, the parquet engine, the
 * elektro client) and are handed over as GETTERS over a ref, so a context value
 * arriving or changing never rebuilds the drivers (which would refetch
 * everything).
 */
export const ExperimentSystemHost = ({ scope }: { scope: ExperimentScopeStores }) => {
  const zarrApi = useElektroZarrStoreApi();
  const engine = useElektroParquetEngine();
  const client = useElektro() as ApolloClient<NormalizedCache> | undefined;
  const datalayer = useDatalayerEndpoint();
  const live = useRef({ zarrApi, engine, client, datalayer });
  live.current = { zarrApi, engine, client, datalayer };

  useEffect(() => {
    const deps: ExperimentDeps = {
      readWindow: (store, ranges, opts) =>
        // `storeByLevelId` holds the fragment objects the layer was built from,
        // so this is the real store, only typed structurally.
        live.current.zarrApi.getState().readWindow(store as ZarrStoreFragment, ranges, opts),
      engine: () => live.current.engine,
      sparse: () => {
        const { client: c, datalayer: d } = live.current;
        if (!c || !d) return null;
        const access = elektroSparseAccess(c, d);
        return {
          open: (choice) => openSparseLayout(access, choice),
          block: readSparseBlock,
          nnz: blockNnz,
        };
      },
      fetchTable: async (id) => {
        const c = live.current.client;
        if (!c) return null;
        const result = await c.query<GetTableDatasetQuery, GetTableDatasetQueryVariables>({
          query: GetTableDatasetDocument,
          variables: { id },
          fetchPolicy: "cache-first",
        });
        return result.data?.tableDataset ?? null;
      },
    };
    const system = createExperimentSystem(scope, deps);
    return () => system.dispose();
  }, [scope]);

  return null;
};
