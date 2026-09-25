import { useEffect, useMemo, useState } from "react";

import { Arkitekt } from "@/app/Arkitekt";
import { findOptionSource } from "@/app/modules/registries";
import type { SearchOptions } from "@/components/fields/SearchField";
import { useModuleHostVersion } from "@/lib/module-host/host";
import { resolveServiceClient } from "@/lib/module-host/operations";
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
      const client = resolveServiceClient(store.getState(), source.service);
      if (!client) return [];
      return source.search(client, {
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
