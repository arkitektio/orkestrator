import { useDatalayerEndpoint, useElektro } from "@/core/app/Arkitekt";
import type { ApolloClient, NormalizedCache } from "@apollo/client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ensureHttpfs, getDuckDb, resolveDuckDbEndpoint } from "@/core/lib/parquet/duckdb";
import { ParquetQueryEngine } from "@/core/lib/parquet/parquetEngine";
import {
  RequestGeneralParquetAccessDocument,
  type RequestGeneralParquetAccessMutation,
  type RequestGeneralParquetAccessMutationVariables,
  RequestParquetAccessDocument,
  type RequestParquetAccessMutation,
  type RequestParquetAccessMutationVariables,
} from "../../api/graphql";

type ElektroClient = ApolloClient<NormalizedCache>;

/**
 * The shared parquet engine (`@/lib/parquet/parquetEngine`) wired to elektro's
 * grants: event tables and unit tables are elektro `TableDataset`s, read in the
 * browser through the app's one DuckDB-WASM instance.
 *
 * Its own engine (own connection, own grant cache) with its own secret prefix —
 * the DuckDB database is shared with mikro, and a secret name is global to it.
 * All GraphQL is imperative (`client.mutate`), so no hook mounts; the Guard
 * obligation is the host's (the elektro module is guarded as a whole).
 */
export const createElektroParquetEngine = (
  client: ElektroClient,
  datalayer: string | null | undefined,
): ParquetQueryEngine =>
  new ParquetQueryEngine({
    connect: async () => {
      const db = await getDuckDb();
      const connection = await db.connect();
      await ensureHttpfs(connection);
      return connection;
    },
    requestGrant: async (storeId) => {
      const response = await client.mutate<
        RequestParquetAccessMutation,
        RequestParquetAccessMutationVariables
      >({
        mutation: RequestParquetAccessDocument,
        variables: { input: { storeId } },
      });
      const grant = response.data?.requestParquetAccess;
      if (!grant) throw new Error("Failed to request parquet access");
      return grant;
    },
    requestRegion: async () => {
      const response = await client.mutate<
        RequestGeneralParquetAccessMutation,
        RequestGeneralParquetAccessMutationVariables
      >({
        mutation: RequestGeneralParquetAccessDocument,
        variables: { input: {} },
      });
      const grant = response.data?.requestGeneralParquetAccess;
      if (!grant) throw new Error("Failed to request general parquet access");
      return grant.region;
    },
    endpoint: resolveDuckDbEndpoint(datalayer ?? undefined),
    secretPrefix: "elektro_store_",
  });

const ElektroParquetContext = createContext<ParquetQueryEngine | null>(null);

/**
 * One engine for the elektro subtree, rebuilt only when the client or the
 * datalayer changes, and disposed (connection closed, grants dropped) when it is.
 * Lazy: nothing connects until the first read, so a page without event or spike
 * layers never starts DuckDB.
 *
 * Created INSIDE the effect, never in a `useMemo` disposed by an effect cleanup:
 * StrictMode runs mount → cleanup → mount, and a memoized engine would come back
 * from that already disposed — every read then answers empty (`readAcross` → [],
 * `readColumnsTyped` → null), which surfaced as "could not read this table
 * columnwise". Each mount owns the engine it disposes.
 */
export const ElektroParquetProvider = ({ children }: { children: ReactNode }) => {
  const client = useElektro() as ElektroClient | undefined;
  const datalayer = useDatalayerEndpoint();
  const [engine, setEngine] = useState<ParquetQueryEngine | null>(null);

  useEffect(() => {
    if (!client) {
      setEngine(null);
      return;
    }
    const created = createElektroParquetEngine(client, datalayer);
    setEngine(created);
    return () => {
      created.dispose();
    };
  }, [client, datalayer]);

  return <ElektroParquetContext.Provider value={engine}>{children}</ElektroParquetContext.Provider>;
};

/** The elektro parquet engine; null outside `ElektroParquetProvider` or without a client. */
export const useElektroParquetEngine = (): ParquetQueryEngine | null =>
  useContext(ElektroParquetContext);
