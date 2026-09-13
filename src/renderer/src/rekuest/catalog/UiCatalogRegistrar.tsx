import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  defaultBlokCatalog,
  UI_CATALOG_DESCRIPTION,
  UI_CATALOG_NAME,
} from "@/blok/renderer/catalog";
import {
  useBaseCatalogQuery,
  useRegisterUiCatalogMutation,
  useUiCatalogsQuery,
} from "@/rekuest/api/graphql";
import { buildRegisterUiCatalogInput, catalogMatches } from "./uiCatalogInput";

/**
 * Registers this client's blok catalog with rekuest once per mount, and only
 * when the server's copy is missing, unregistered, or differs from what the
 * renderer offers (`defaultBlokCatalog`). The server copy is the source of
 * truth, so no local "already done" flag is kept.
 *
 * Must be mounted inside `Guard.Rekuest`: both hooks need rekuest's Apollo
 * client, which only exists once the service is ready. The guard remounts it
 * when the endpoint changes, which is exactly when a re-check is due.
 */
export const UiCatalogRegistrar = () => {
  // The server refuses a UI catalog that redefines its built-in base
  // operations (`eq`, `if`, `get`, …), so those are excluded from what we send.
  const base = useBaseCatalogQuery({ fetchPolicy: "network-only" });
  const reservedOperations = useMemo(
    () => new Set(base.data?.baseCatalog.operations.map((operation) => operation.name) ?? []),
    [base.data],
  );
  const input = useMemo(
    () =>
      buildRegisterUiCatalogInput(
        defaultBlokCatalog,
        { name: UI_CATALOG_NAME, description: UI_CATALOG_DESCRIPTION },
        { reservedOperations },
      ),
    [reservedOperations],
  );

  const catalogs = useUiCatalogsQuery({ fetchPolicy: "network-only" });
  const data = catalogs.data;
  const loading = catalogs.loading || base.loading;
  const error = catalogs.error ?? base.error;
  const [register] = useRegisterUiCatalogMutation({
    refetchQueries: ["UiCatalogs", "GetBlok"],
  });
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current || loading) {
      return;
    }

    if (error) {
      // The query hook already reports through the shared error handler;
      // registering blind would only add a second failure.
      return;
    }

    if (!data || !base.data) {
      return;
    }

    attemptedRef.current = true;

    const remote = data.uiCatalogs.find((catalog) => catalog.name === input.name);
    if (catalogMatches(remote, input)) {
      console.debug(
        `[ui-catalog] "${input.name}" already registered and up to date (${input.components.length} components, ${input.operations.length} operations).`,
      );
      return;
    }

    void register({ variables: { input } }).then((result) => {
      // `useMutation` from @/lib/rekuest/hooks sets onError, so failures
      // resolve without data rather than rejecting.
      if (!result.data) {
        const detail = result.errors?.map((issue) => issue.message).join("; ");
        toast.error(
          `Could not register the UI catalog with rekuest${detail ? `: ${detail}` : "."}`,
        );
        return;
      }
      console.info(
        `[ui-catalog] registered "${result.data.registerUiCatalog.name}" (${input.components.length} components, ${input.operations.length} operations).`,
      );
    });
  }, [base.data, data, error, input, loading, register]);

  return null;
};

export default UiCatalogRegistrar;
