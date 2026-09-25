import { useCallback } from "react";

import { Arkitekt } from "@/core/lib/arkitekt/host";
import { MODULE_OPERATIONS } from "@/core/modules/registries";
import { resolveServiceClient } from "@/core/lib/module-host/operations";
import type { JSONObject, JSONValue } from "@/core/types";

/**
 * Calls another module's named operation (its `operations` builtin), e.g.
 * `useOperation("alpaka.startRoom")`, with that module's own client. Rejects
 * when no module offers it or its service is not ready.
 */
export const useOperation = <R extends JSONValue = JSONValue>(name: string) => {
  const store = Arkitekt.useStoreApi();
  return useCallback(
    async (args: JSONObject): Promise<R> => {
      const operation = MODULE_OPERATIONS[name];
      if (!operation) throw new Error(`No module offers ${name}`);
      const client = resolveServiceClient(store.getState(), operation.service);
      if (!client) throw new Error(`${operation.service} is not available for ${name}`);
      return (await operation.run(client, args)) as R;
    },
    [name, store],
  );
};
