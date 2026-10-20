import type { Service } from "@/core/connection/arkitekt/types";
import { buildDeleteAction } from "@/core/smart/localactions/builders/deleteAction";
import { Action } from "@/core/smart/localactions/LocalActionProvider";
import type { Structure } from "@/core/smart/localactions/LocalActionProvider";
import {
  ArchivePythonFlowDocument,
  DeletePythonFlowDocument,
  PublishPythonFlowDocument,
  PythonFlowStatus,
} from "@/fluss/api/graphql";
import {
  ListImplementationsDocument,
  ListImplementationsQuery,
  ListImplementationsQueryVariables,
} from "@/rekuest/api/graphql";
import { ApolloClient, NormalizedCache } from "@apollo/client";
import { Archive, Play, Rocket, Send } from "lucide-react";
import { pythonFlowInterface } from "./utils";

const PYTHON_FLOW = "@fluss/pythonflow";

const STATUS_LABEL: Record<PythonFlowStatus, string> = {
  [PythonFlowStatus.Draft]: "a draft",
  [PythonFlowStatus.Published]: "published",
  [PythonFlowStatus.Archived]: "archived",
};

const clientOf = (services: Record<string, unknown>, key: string) => {
  const client = (services[key] as Service | undefined)?.client as ApolloClient<NormalizedCache> | undefined;
  if (!client) throw new Error(`The ${key} service is not available`);
  return client;
};

const selectedFlows = (left: readonly Structure[]) => left.filter((s) => s.identifier === PYTHON_FLOW);

/**
 * The status a selected version's descriptors carry, when they carry it: a
 * transition it cannot make is refused here, in a sentence, before the server
 * is asked (which refuses it anyway).
 */
const refuseUnless = (flow: Structure, allowed: PythonFlowStatus[], verb: string) => {
  const status = flow.descriptors?.["@fluss/status"] as PythonFlowStatus | undefined;
  if (status && !allowed.includes(status)) {
    throw new Error(`This version is ${STATUS_LABEL[status]}, so it can't be ${verb}`);
  }
};

const onePythonFlow = [{ type: "identifier", identifier: PYTHON_FLOW }, { type: "nopartner" }] as const;

export const FLUSS_ACTIONS: Record<string, Action> = {
  "publish-pythonflow": {
    title: "Publish",
    description: "Make this version runnable, and deployable as an action",
    icon: Send,
    conditions: onePythonFlow,
    execute: async ({ state, services }) => {
      const fluss = clientOf(services as Record<string, unknown>, "fluss");
      for (const flow of selectedFlows(state.left)) {
        refuseUnless(flow, [PythonFlowStatus.Draft, PythonFlowStatus.Archived], "published");
        await fluss.mutate({ mutation: PublishPythonFlowDocument, variables: { id: String(flow.id) }, refetchQueries: ["PythonFlows"] });
      }
    },
  },
  "archive-pythonflow": {
    title: "Archive",
    description: "Stop this version from running; its runs stay",
    icon: Archive,
    conditions: onePythonFlow,
    execute: async ({ state, services }) => {
      const fluss = clientOf(services as Record<string, unknown>, "fluss");
      for (const flow of selectedFlows(state.left)) {
        refuseUnless(flow, [PythonFlowStatus.Published], "archived");
        await fluss.mutate({ mutation: ArchivePythonFlowDocument, variables: { id: String(flow.id) }, refetchQueries: ["PythonFlows"] });
      }
    },
  },
  "delete-pythonflow": buildDeleteAction({
    identifier: PYTHON_FLOW,
    title: "Delete draft",
    description: "Delete this draft version (a published one is archived instead)",
    mutation: DeletePythonFlowDocument,
    typename: "PythonFlow",
    service: "fluss",
  }),
  "deploy-pythonflow": {
    title: "Deploy as action…",
    description: "Make this published version an action on an agent that runs Python flows",
    icon: Rocket,
    conditions: onePythonFlow,
    execute: async ({ state, dialog }) => {
      const [flow] = selectedFlows(state.left);
      if (!flow) throw new Error("No Python flow selected");
      refuseUnless(flow, [PythonFlowStatus.Published], "deployed");
      dialog.openDialog("deploypythonflow", { flow: String(flow.id) }, { size: "medium" });
    },
  },
  "run-pythonflow": {
    title: "Run…",
    description: "Run this published version where it is deployed (deploying it first if it is not)",
    icon: Play,
    conditions: onePythonFlow,
    execute: async ({ state, dialog, services }) => {
      const [flow] = selectedFlows(state.left);
      if (!flow) throw new Error("No Python flow selected");
      refuseUnless(flow, [PythonFlowStatus.Published], "run");
      const rekuest = clientOf(services as Record<string, unknown>, "rekuest");
      const { data } = await rekuest.query<ListImplementationsQuery, ListImplementationsQueryVariables>({
        query: ListImplementationsDocument,
        variables: { filters: { interface: { exact: pythonFlowInterface(String(flow.id)) } } },
        fetchPolicy: "network-only",
      });
      const deployment =
        data.implementations.find((impl) => impl.agent.active) ?? data.implementations.at(0);
      if (deployment) {
        dialog.openDialog("assign", { target: { implementation: deployment.id } });
      } else {
        dialog.openDialog("deploypythonflow", { flow: String(flow.id), runAfter: true }, { size: "medium" });
      }
    },
  },
};
