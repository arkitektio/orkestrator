import type { useDialog } from "@/app/dialog";
import type { DownloadProps } from "@/providers/download/DownloadProvider";
import type { FullTaskQuery } from "@/rekuest/api/graphql";
import type { ApolloClient } from "@apollo/client";

export type HookTask = NonNullable<FullTaskQuery["task"]>;

/**
 * Everything a task-hook handler needs, assembled by the `TaskHookRunner` (which
 * lives in React) so handlers themselves can be plain functions:
 * - `task` + `returns`: the completed task and its yielded return values
 *   (positional, aligned to `task.action.returns`).
 * - `params`: the opaque params stored when the hook was registered.
 * - `getClient` / `datalayerEndpoint`: service access for module-specific work.
 * - `startDownload`, `navigate`, `dialog`: common client capabilities.
 */
export interface HookContext {
  task: HookTask;
  returns: unknown[];
  params: Record<string, unknown>;
  getClient: (service: string) => ApolloClient<unknown> | undefined;
  datalayerEndpoint?: string;
  startDownload: DownloadProps["startDownload"];
  navigate: (path: string) => void;
  dialog: ReturnType<typeof useDialog>;
}

/** A thing to run when a task succeeds (or fails), keyed by `type`. */
export interface TaskHook {
  type: string;
  onSuccess: (ctx: HookContext) => void | Promise<void>;
  onError?: (ctx: HookContext) => void | Promise<void>;
}
