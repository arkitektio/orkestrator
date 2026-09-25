import {
  RequestGeneralParquetAccessDocument,
  RequestGeneralParquetAccessMutation,
  RequestParquetAccessDocument,
  RequestParquetAccessMutation,
} from "@/mikro/api/graphql";
import type { MikroClient } from "@/lib/zarr/store/types";
import {
  ensureHttpfs,
  getDuckDb,
  resolveDuckDbEndpoint,
} from "../duckdb/duckdb";
import { AttributeLookupEngine } from "./lookupEngine";

/**
 * The one canonical wiring of `AttributeLookupEngine` onto the app's shared
 * DuckDB instance and the mikro grant mutations. All GraphQL is imperative
 * (`client.mutate`) — no hooks mount, so the Guard.Mikro obligation stays on
 * the calling host.
 */
export function createLookupEngine(
  client: MikroClient,
  datalayer: string | null | undefined,
): AttributeLookupEngine {
  return new AttributeLookupEngine({
    connect: async () => {
      const db = await getDuckDb();
      const connection = await db.connect();
      await ensureHttpfs(connection);
      return connection;
    },
    requestGrant: async (storeId) => {
      const response = (await client.mutate({
        mutation: RequestParquetAccessDocument,
        variables: { input: { storeId } },
      })) as { data?: RequestParquetAccessMutation };
      const grant = response.data?.requestParquetAccess;
      if (!grant) throw new Error("Failed to request parquet access");
      return grant;
    },
    requestRegion: async () => {
      const response = (await client.mutate({
        mutation: RequestGeneralParquetAccessDocument,
        variables: { input: {} },
      })) as { data?: RequestGeneralParquetAccessMutation };
      const grant = response.data?.requestGeneralParquetAccess;
      if (!grant) throw new Error("Failed to request general parquet access");
      return grant.region;
    },
    endpoint: resolveDuckDbEndpoint(datalayer ?? undefined),
  });
}
