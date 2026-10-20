import { useEffect, useMemo, useRef } from "react";
import {
  defaultBlokCatalog,
  UI_CATALOG_DESCRIPTION,
  UI_CATALOG_NAME,
} from "@/core/blok/renderer/catalog";
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
      // The catalog list could not be read; registering blind would only
      // add a second failure.
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

    // A background registration: a failure is for the console, the user
    // started nothing.
    register({ variables: { input } }).then(
      (result) => {
        if (!result.data) {
          console.error("[ui-catalog] registration answered without data", result.errors);
          return;
        }
        console.info(
          `[ui-catalog] registered "${result.data.registerUiCatalog.name}" (${input.components.length} components, ${input.operations.length} operations).`,
        );
      },
      (failure) => console.error("[ui-catalog] could not register the UI catalog", failure),
    );
  }, [base.data, data, error, input, loading, register]);

  return null;
};

export default UiCatalogRegistrar;
