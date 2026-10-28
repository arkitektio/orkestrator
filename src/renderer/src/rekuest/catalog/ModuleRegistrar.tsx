import { useEffect, useMemo, useRef } from "react";
import { orkestratorUi } from "@/core/blok/catalog";
import { useModulesQuery, useRegisterModuleMutation } from "@/rekuest/api/graphql";
import { buildRegisterModuleInput, moduleMatches } from "./uiCatalogInput";

/**
 * Registers this client's module (`orkestrator`: what it draws beyond the
 * spec's catalogs) with rekuest once per mount, and only when the server's
 * copy is missing, unregistered, or differs from what the renderer offers
 * (`orkestratorUi`). The server copy is the source of truth, so no local
 * "already done" flag is kept.
 *
 * Must be mounted inside `Guard.Rekuest`: both hooks need rekuest's Apollo
 * client, which only exists once the service is ready. The guard remounts it
 * when the endpoint changes, which is exactly when a re-check is due.
 */
export const ModuleRegistrar = () => {
  // The declaration says it all: the global catalogs it claims, and the
  // `orkestrator` module, what it draws beyond them (its modules' bloks).
  const input = useMemo(() => buildRegisterModuleInput(orkestratorUi), []);

  const modules = useModulesQuery({ fetchPolicy: "network-only" });
  const data = modules.data;
  const loading = modules.loading;
  const error = modules.error;
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

    if (!data) {
      return;
    }

    attemptedRef.current = true;

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
  }, [data, error, input, loading, register]);

  return null;
};

export default ModuleRegistrar;
