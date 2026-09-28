import type { Service } from "@/core/connection/arkitekt/types";
import { toast } from "@/core/notify";
import { Action, ActionParams } from "@/core/smart/localactions/LocalActionProvider";
import { ApolloClient, NormalizedCache } from "@apollo/client";
import { CloudUpload, History, ListRestart, Undo2 } from "lucide-react";
import { pushChanges, revertToServer, undoChanges } from "../mailOps";

const ACCOUNT = "@kuvert/account";
const MESSAGE = "@kuvert/message";

// Same cast as `buildDeleteAction`: the deferred service type does not resolve
// here, but every concrete service carries a `.client`.
const kuvertClient = (services: ActionParams["services"]) => {
  const client = (services.kuvert as unknown as Service | undefined)?.client as
    | ApolloClient<NormalizedCache>
    | undefined;
  if (!client) throw new Error("Mail service not available");
  return client;
};

/** The selected ids of one kind; the condition matches on any, so a mixed selection is narrowed here. */
const idsOf = (state: ActionParams["state"], identifier: string) =>
  state.left.filter((s) => s.identifier === identifier && s.id).map((s) => String(s.id));

const need = (ids: string[], what: string) => {
  if (ids.length === 0) throw new Error(`No ${what} selected`);
  return ids;
};

/** The change queue: changes made here wait (undo window, back-off) before they reach the server. */
export const CHANGE_ACTIONS: Record<string, Action> = {
  "kuvert-undo-changes": {
    title: "Undo unsynced changes",
    description: "Take back what was changed here and has not reached the server yet",
    icon: Undo2,
    conditions: [{ type: "identifier", identifier: MESSAGE }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress }) => {
      await undoChanges(kuvertClient(services), { messages: need(idsOf(state, MESSAGE), "mail") });
      onProgress(100);
    },
  },
  "kuvert-revert-to-server": {
    title: "Revert to server",
    description: "Drop flags and categories kept only here: back to what the server has",
    icon: ListRestart,
    conditions: [{ type: "identifier", identifier: MESSAGE }, { type: "nopartner" }],
    execute: async ({ services, state, confirm, onProgress }) => {
      const messages = need(idsOf(state, MESSAGE), "mail");
      const ok = await confirm({
        title: "Revert to what the server has?",
        description: "Read state, flags and categories changed here and not pushed are dropped.",
        confirmLabel: "Revert",
      });
      if (!ok) return;
      await revertToServer(kuvertClient(services), messages);
      onProgress(100);
    },
  },
  "kuvert-push-changes": {
    title: "Push changes now",
    description: "Send this mailbox's waiting changes to the server without waiting out the undo window",
    icon: CloudUpload,
    conditions: [{ type: "identifier", identifier: ACCOUNT }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress }) => {
      const ids = need(idsOf(state, ACCOUNT), "mailbox");
      const client = kuvertClient(services);
      for (const [i, id] of ids.entries()) {
        toast.success(await pushChanges(client, id));
        onProgress(((i + 1) / ids.length) * 100);
      }
    },
  },
  "kuvert-review-changes": {
    title: "Review unsynced changes",
    description: "What was changed here and has not reached the server",
    icon: History,
    conditions: [{ type: "identifier", identifier: ACCOUNT }, { type: "nopartner" }],
    execute: async ({ navigate, state }) => {
      const [id] = need(idsOf(state, ACCOUNT), "mailbox");
      navigate(`/kuvert/changes?account=${id}`);
    },
  },
};
