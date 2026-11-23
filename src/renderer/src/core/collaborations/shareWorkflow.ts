import type { TypedDocumentNode } from "@apollo/client";

import type { OperationHandler } from "@/core/modules/host/operations";
import type { JSONObject, JSONValue } from "@/core/types";

/**
 * Sharing a workflow across services.
 *
 * A workflow is a rekuest root task. No service knows which other services a workflow
 * touched, so the client asks every connected service that can (`<namespace>.shareWorkflow`,
 * an `operations` builtin made with `shareWorkflowOperation`) to put what it made under that
 * task in the collaboration, with the same key. A dry run first, then the real one.
 */

/** The operation name a module registers for `shareWorkflow` on its own service. */
export const SHARE_WORKFLOW = "shareWorkflow";

export const shareWorkflowOperationName = (namespace: string) => `${namespace}.${SHARE_WORKFLOW}`;

/** The namespace of a `<namespace>.shareWorkflow` operation, or undefined for any other. */
export const shareWorkflowNamespace = (operation: string): string | undefined => {
  const suffix = `.${SHARE_WORKFLOW}`;
  return operation.endsWith(suffix) && operation.length > suffix.length
    ? operation.slice(0, -suffix.length)
    : undefined;
};

/** One object of a service, by its structure identifier. */
export type SharedObject = { identifier: string | null; object: string };

/** Left out: a part of something (`whole`) made before the workflow, which was not shared. */
export type SkippedObject = SharedObject & { wholeIdentifier: string | null; whole: string };

/** What one service put in (or, on a dry run, would put in) the collaboration. */
export type WorkflowShare = {
  collaboration: string;
  dryRun: boolean;
  /** Put in, with what each needs to be seen. */
  added: SharedObject[];
  /** How many parts came along with their whole, without being put in themselves. */
  covered: number;
  skipped: SkippedObject[];
  /** Structures of the service that cannot say what created their objects: not looked at. */
  unknown: string[];
};

/** What the operation takes: the collaboration's key, the root task, and its name on the service. */
export type ShareWorkflowArgs = {
  collaboration: string;
  rootTask: string;
  dryRun: boolean;
  /** The collaboration's name, for the service's row of it when this makes it. */
  name?: string | null;
};

/** The selection every service's `ShareWorkflow` mutation asks for (the same on each). */
type ShareWorkflowResult = {
  shareWorkflow: {
    collaboration: string;
    dryRun: boolean;
    added: { identifier?: string | null; object: string }[];
    covered: number;
    skipped: { identifier?: string | null; object: string; wholeIdentifier?: string | null; whole: string }[];
    unknown: string[];
  };
};

type ShareWorkflowVariables = {
  input: { collaboration: string; rootTask: string; dryRun: boolean; name?: string | null };
};

const asString = (value: JSONValue | undefined): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

/** The operation's args, checked: it is called with plain data from another module. */
export const readShareWorkflowArgs = (args: JSONObject): ShareWorkflowArgs => {
  const collaboration = asString(args.collaboration);
  const rootTask = asString(args.rootTask);
  if (!collaboration) throw new Error("Which collaboration?");
  if (!rootTask) throw new Error("Which workflow?");
  return { collaboration, rootTask, dryRun: args.dryRun !== false, name: asString(args.name) ?? null };
};

/**
 * A module's `<namespace>.shareWorkflow` operation over its own `ShareWorkflow` mutation.
 * Args `{ collaboration, rootTask, dryRun, name? }` (`dryRun` defaults to true: nothing is
 * written unless asked); answers a `WorkflowShare`.
 */
export const shareWorkflowOperation = (
  service: string,
  mutation: TypedDocumentNode<ShareWorkflowResult, ShareWorkflowVariables>,
): OperationHandler => ({
  service,
  run: async (client, args: JSONObject) => {
    const input = readShareWorkflowArgs(args);
    const result = await client.mutate<ShareWorkflowResult, ShareWorkflowVariables>({
      mutation,
      variables: { input },
    });
    const share = result.data?.shareWorkflow;
    if (!share) throw new Error(`${service} did not answer the share`);
    const report: WorkflowShare = {
      collaboration: share.collaboration,
      dryRun: share.dryRun,
      added: share.added.map((entry) => ({ identifier: entry.identifier ?? null, object: entry.object })),
      covered: share.covered,
      skipped: share.skipped.map((entry) => ({
        identifier: entry.identifier ?? null,
        object: entry.object,
        wholeIdentifier: entry.wholeIdentifier ?? null,
        whole: entry.whole,
      })),
      unknown: [...share.unknown],
    };
    return report as unknown as JSONObject;
  },
});

/** One service's part of the combined report. */
export type ServiceShare =
  | { namespace: string; label: string; status: "done"; share: WorkflowShare }
  | { namespace: string; label: string; status: "failed"; error: unknown }
  | { namespace: string; label: string; status: "unavailable" };

/** The combined report's totals, over the services that answered. */
export const shareTotals = (shares: readonly ServiceShare[]) => {
  const done = shares.flatMap((share) => (share.status === "done" ? [share.share] : []));
  return {
    added: done.reduce((sum, share) => sum + share.added.length, 0),
    covered: done.reduce((sum, share) => sum + share.covered, 0),
    skipped: done.reduce((sum, share) => sum + share.skipped.length, 0),
    unknown: done.reduce((sum, share) => sum + share.unknown.length, 0),
    failed: shares.filter((share) => share.status === "failed").length,
    unavailable: shares.filter((share) => share.status === "unavailable").length,
  };
};

/** Services with something to say first (most added), then the empty ones, then the failed. */
export const orderShares = (shares: readonly ServiceShare[]): ServiceShare[] => {
  const weight = (share: ServiceShare) =>
    share.status === "done"
      ? share.share.added.length + share.share.skipped.length + share.share.covered + share.share.unknown.length
      : -1;
  return [...shares].sort((a, b) => weight(b) - weight(a) || a.label.localeCompare(b.label));
};
