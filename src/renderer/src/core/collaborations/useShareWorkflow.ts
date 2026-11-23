import { useCallback } from "react";

import { Arkitekt } from "@/core/connection/arkitekt/host";
import { useModuleHostVersion } from "@/core/modules/host/host";
import { resolveServiceClient } from "@/core/modules/host/operations";
import { MODULE_OPERATIONS, moduleDefinitions } from "@/core/modules/registries";

import {
  shareWorkflowNamespace,
  type ServiceShare,
  type ShareWorkflowArgs,
  type WorkflowShare,
} from "./shareWorkflow";

/** A module's label ("Data", "Tasks"), by its namespace. */
const labelOf = (namespace: string): string =>
  moduleDefinitions().find((definition) => definition.manifest.namespace === namespace)?.manifest.label ?? namespace;

/** The installed modules that can share a workflow, by namespace, with their operation names. */
export const shareWorkflowTargets = (): { namespace: string; label: string; operation: string }[] =>
  Object.keys(MODULE_OPERATIONS).flatMap((operation) => {
    const namespace = shareWorkflowNamespace(operation);
    return namespace ? [{ namespace, label: labelOf(namespace), operation }] : [];
  });

/**
 * Share a workflow on every connected service that can: the same collaboration key and root
 * task to each, in parallel. A service that is not connected is reported `unavailable`, one
 * that fails `failed`; neither stops the others.
 */
export const useShareWorkflow = () => {
  // Re-rendered when a module comes or goes, so `targets` follows the installed ones.
  useModuleHostVersion();
  const store = Arkitekt.useStoreApi();
  const targets = shareWorkflowTargets();

  const run = useCallback(
    async (args: ShareWorkflowArgs): Promise<ServiceShare[]> =>
      Promise.all(
        targets.map(async ({ namespace, label, operation }): Promise<ServiceShare> => {
          const handler = MODULE_OPERATIONS[operation];
          const client = handler ? resolveServiceClient(store.getState(), handler.service) : undefined;
          if (!handler || !client) return { namespace, label, status: "unavailable" };
          try {
            const share = (await handler.run(client, { ...args, name: args.name ?? null })) as unknown as WorkflowShare;
            return { namespace, label, status: "done", share };
          } catch (error) {
            return { namespace, label, status: "failed", error };
          }
        }),
      ),
    [targets, store],
  );

  return { targets, run };
};
