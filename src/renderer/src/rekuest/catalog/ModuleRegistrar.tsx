import { useEffect, useMemo, useRef } from "react";
import {
  defaultBlokCatalog,
  UI_CATALOG_DESCRIPTION,
  UI_CATALOG_NAME,
} from "@/core/blok/renderer/catalog";
import {
  useBaseCatalogQuery,
  useModulesQuery,
  useRegisterModuleMutation,
} from "@/rekuest/api/graphql";
import { implementedCatalogs, missingCatalogComponents, specOwnedComponents } from "@/core/blok/renderer/modules";
import { buildRegisterModuleInput, moduleMatches } from "./uiCatalogInput";

/**
 * Registers this client's module (`orkestrator`: what it draws beyond the
 * spec's catalogs) with rekuest once per mount, and only when the server's
 * copy is missing, unregistered, or differs from what the renderer offers
 * (`defaultBlokCatalog`). The server copy is the source of truth, so no local
 * "already done" flag is kept.
 *
 * Must be mounted inside `Guard.Rekuest`: both hooks need rekuest's Apollo
 * client, which only exists once the service is ready. The guard remounts it
 * when the endpoint changes, which is exactly when a re-check is due.
 */
export const ModuleRegistrar = () => {
  // The server refuses a module that redefines its built-in base operations
  // or components (`foreach`, `match`, …), so those are excluded from what we
  // send: it holds them already.
  const base = useBaseCatalogQuery({ fetchPolicy: "network-only" });
  const reservedOperations = useMemo(
    () => new Set(base.data?.baseCatalog.operations.map((operation) => operation.name) ?? []),
    [base.data],
  );
  // The spec owns base and the standard catalogs: the `orkestrator` module is
  // only what this app draws beyond them, and `catalogs` names the standard
  // catalogs it implements whole, which the server resolves from the spec.
  const reservedComponents = useMemo(
    () =>
      new Set([
        ...(base.data?.baseCatalog.components.map((component) => component.name) ?? []),
        ...specOwnedComponents(defaultBlokCatalog),
      ]),
    [base.data],
  );
  const input = useMemo(
    () =>
      buildRegisterModuleInput(
        defaultBlokCatalog,
        { name: UI_CATALOG_NAME, description: UI_CATALOG_DESCRIPTION },
        { reservedOperations, reservedComponents, catalogs: implementedCatalogs(defaultBlokCatalog) },
      ),
    [reservedOperations, reservedComponents],
  );

  const modules = useModulesQuery({ fetchPolicy: "network-only" });
  const data = modules.data;
  const loading = modules.loading || base.loading;
  const error = modules.error ?? base.error;
  const [register] = useRegisterModuleMutation({
    refetchQueries: ["Modules", "GetBlok"],
  });
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current || loading) {
      return;
    }

    if (error) {
      // The module list could not be read; registering blind would only
      // add a second failure.
      return;
    }

    if (!data || !base.data) {
      return;
    }

    attemptedRef.current = true;

    const missing = missingCatalogComponents(defaultBlokCatalog);
    if (Object.keys(missing).length > 0) {
      // A catalog with a component left undrawn is not claimed: say which.
      console.warn("[module] not claiming catalogs this renderer draws only in part", missing);
    }

    const remote = data.modules.find((module) => module.name === input.name);
    if (moduleMatches(remote, input)) {
      console.debug(
        `[module] "${input.name}" already registered and up to date (${input.components.length} components, ${input.operations.length} operations; implements ${input.catalogs.join(", ")}).`,
      );
      return;
    }

    // A background registration: a failure is for the console, the user
    // started nothing.
    register({ variables: { input } }).then(
      (result) => {
        if (!result.data) {
          console.error("[module] registration answered without data", result.errors);
          return;
        }
        console.info(
          `[module] registered "${result.data.registerModule.name}" (${input.components.length} components, ${input.operations.length} operations; implements ${input.catalogs.join(", ")}).`,
        );
      },
      (failure) => console.error("[module] could not register the module", failure),
    );
  }, [base.data, data, error, input, loading, register]);

  return null;
};

export default ModuleRegistrar;
