import { useEffect, useMemo, useState } from "react";

import { Arkitekt } from "@/app/Arkitekt";
import { findOptionSource } from "@/app/modules/registries";
import type { SearchOptions } from "@/components/fields/SearchField";
import { useModuleHostVersion } from "@/lib/module-host/host";
import type { StructureOption } from "@/lib/module-host/options";

/**
 * A search over another module's models, for a picker (a user chip, an app
 * filter): `useStructureOptions("@lok/user")`. The owning module answers
 * through its `optionSources` builtin, with its own client, which the host
 * resolves. `undefined` when no module answers for it.
 */
export const useStructureOptions = (identifier: string, by?: string) => {
  useModuleHostVersion();
  const store = Arkitekt.useStoreApi();
  const source = findOptionSource(identifier, by);

  return useMemo(() => {
    if (!source) return undefined;
    return async ({ search, values }: SearchOptions): Promise<StructureOption[]> => {
      const state = store.getState();
      const connection = state.connection as
        | { selfService?: { client?: unknown }; serviceMap?: Record<string, { client?: unknown } | undefined> }
        | undefined;
      const client =
        source.service === "lok"
          ? connection?.selfService?.client
          : state.serviceStates[source.service]?.status === "ready"
            ? connection?.serviceMap?.[source.service]?.client
            : undefined;
      if (!client) return [];
      return source.search(client as never, {
        search: search || undefined,
        values: values?.map(String),
      });
    };
  }, [source, store]);
};

/** Every option at once, for a short list (a filter menu). */
export const useStructureOptionList = (identifier: string, by?: string): StructureOption[] => {
  const search = useStructureOptions(identifier, by);
  const [options, setOptions] = useState<StructureOption[]>([]);
  useEffect(() => {
    let cancelled = false;
    search?.({}).then((found) => {
      if (!cancelled) setOptions(found);
    });
    return () => {
      cancelled = true;
    };
  }, [search]);
  return options;
};
