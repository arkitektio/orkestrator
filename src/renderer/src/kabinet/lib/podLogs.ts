import type { ApolloClient } from "@apollo/client";
import { buildAssignInput } from "@/rekuest/assign";
import {
  AgentsDocument,
  type AgentsQuery,
  type AgentsQueryVariables,
  AssignDocument,
  type AssignMutation,
  type AssignMutationVariables,
  DemandKind,
  ListImplementationsDocument,
  type ListImplementationsQuery,
  type ListImplementationsQueryVariables,
  PortKind,
} from "@/rekuest/api/graphql";
import { GetPodDocument, type GetPodQuery, type GetPodQueryVariables } from "../api/graphql";

export const POD_IDENTIFIER = "@kabinet/pod";

/**
 * A pod's logs are not read by kabinet: the backend's agent reads them off
 * its engine and dumps them (`dumpLogs`). Refreshing is therefore a rekuest
 * run of that agent's log action on the pod, and then waiting for the dump.
 */

// Colour and cursor escapes a container prints for a terminal.
// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;

/** A dump as lines: escapes stripped, the trailing blank lines dropped. */
export const logLines = (logs: string): string[] => {
  const lines = logs.replace(ANSI, "").replace(/\r\n?/g, "\n").split("\n");
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  return lines;
};

export type LogTone = "error" | "warning";

/** What a line says about itself, read off the level word loggers print. */
export const logTone = (line: string): LogTone | undefined => {
  if (/\b(ERROR|CRITICAL|FATAL|Traceback|Exception)\b/.test(line)) return "error";
  if (/\b(WARN|WARNING)\b/.test(line)) return "warning";
  return undefined;
};

export type LogActionCandidate = {
  id: string;
  interface: string;
  action: { name: string };
  agent: { name: string; active: boolean };
};

/**
 * Of an agent's actions that take a pod, the one that reads its logs: named
 * for logs (`refresh_logs`, "Dump logs"), one a live agent offers first.
 */
export const pickLogAction = <T extends LogActionCandidate>(candidates: readonly T[]): T | undefined => {
  const logging = candidates.filter((candidate) => /log/i.test(candidate.interface) || /log/i.test(candidate.action.name));
  return logging.find((candidate) => candidate.agent.active) ?? logging.at(0);
};

const aborted = () => {
  const error = new Error("Cancelled");
  error.name = "AbortError";
  return error;
};

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(aborted());
    const onAbort = () => {
      clearTimeout(timer);
      reject(aborted());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });

/**
 * Ask the pod's backend for its logs again and wait until they arrive. The
 * waiting reads the pod from the network, so an open pod page shows the new
 * dump through the cache without being told.
 */
export const refreshPodLogs = async (options: {
  kabinet: ApolloClient<any>;
  rekuest: ApolloClient<any>;
  pod: string;
  signal?: AbortSignal;
  /** How long to wait for the dump, and how often to look. */
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<void> => {
  const { kabinet, rekuest, signal, timeoutMs = 30_000, intervalMs = 1_500 } = options;

  const readPod = async () => {
    const { data } = await kabinet.query<GetPodQuery, GetPodQueryVariables>({
      query: GetPodDocument,
      variables: { id: options.pod },
      fetchPolicy: "network-only",
    });
    return data.pod;
  };

  const pod = await readPod();
  const before = pod.latestLogDump?.createdAt;

  const agents = await rekuest.query<AgentsQuery, AgentsQueryVariables>({
    query: AgentsDocument,
    variables: { filters: { clientId: pod.backend.clientId } },
    fetchPolicy: "network-only",
  });
  const agentIds = agents.data.agents.map((agent) => agent.id);
  if (agentIds.length === 0) {
    throw new Error(`${pod.backend.name} has no agent that could read the logs`);
  }

  const implementations = await rekuest.query<ListImplementationsQuery, ListImplementationsQueryVariables>({
    query: ListImplementationsDocument,
    variables: {
      filters: {
        agent: { ids: agentIds },
        action: {
          demands: [
            {
              kind: DemandKind.Args,
              matches: [{ key: "pod", kind: PortKind.Structure, identifier: POD_IDENTIFIER }],
            },
          ],
        },
      },
    },
    fetchPolicy: "network-only",
  });
  const action = pickLogAction(implementations.data.implementations);
  if (!action) {
    throw new Error(`${pod.backend.name} does not offer to read a pod's logs`);
  }
  if (!action.agent.active) {
    throw new Error(`${action.agent.name} is not connected, so it cannot read the logs now`);
  }
  if (signal?.aborted) throw aborted();

  await rekuest.mutate<AssignMutation, AssignMutationVariables>({
    mutation: AssignDocument,
    variables: {
      input: {
        ...buildAssignInput({
          args: { pod: { __identifier: POD_IDENTIFIER, object: options.pod } },
          implementation: action.id,
        }),
        hooks: [],
      },
    },
  });

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await wait(intervalMs, signal);
    const latest = (await readPod()).latestLogDump?.createdAt;
    if (latest && latest !== before) return;
  }
  throw new Error(`${action.agent.name} was asked for the logs, but has not sent them yet`);
};
