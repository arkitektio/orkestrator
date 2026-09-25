import { useDatalayerEndpoint } from "@/core/lib/arkitekt/host";
import { useElektro } from "@/elektro/api/funcs";
import { ApolloClient, NormalizedCache } from "@apollo/client";
import { useMemo } from "react";
import {
  createElektroZarrStore,
  DEFAULT_ZARR_CONFIG,
  ElektroZarrStoreContext,
  ZarrStoreConfig,
} from "./zarrStore";

/**
 * Provides a single elektro-scoped zarr data store to the whole elektro subtree.
 * The store requests general zarr access once and keeps a registry of open zarr
 * arrays, so trace rendering across pages reuses both credentials and stores.
 */
export const ElektroZarrStoreProvider = ({
  config,
  children,
}: {
  config?: Partial<ZarrStoreConfig>;
  children: React.ReactNode;
}) => {
  const client = useElektro();
  const datalayer = useDatalayerEndpoint();

  const store = useMemo(
    () =>
      createElektroZarrStore(
        client as ApolloClient<NormalizedCache> | undefined,
        datalayer,
        { ...DEFAULT_ZARR_CONFIG, ...config },
      ),
    // Rebuild the store (and its registry) only when the client/datalayer change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, datalayer],
  );

  return (
    <ElektroZarrStoreContext.Provider value={store}>
      {children}
    </ElektroZarrStoreContext.Provider>
  );
};
