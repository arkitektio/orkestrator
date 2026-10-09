import type { ApolloClient, NormalizedCache } from "@apollo/client";
import { Video } from "lucide-react";

import type { Action } from "@/core/smart/localactions/LocalActionProvider";
import { EnsureCallDocument, type EnsureCallMutation, type EnsureCallMutationVariables } from "@/lovekit/api/graphql";
import { callLink, callTitle } from "./call/links";
import { toStructureInputs } from "./call/structureInput";

const CALL_IDENTIFIER = "@lovekit/call";

/**
 * "Call about this": the live call about the selection, or a new one, and
 * straight into it. On any object; on a call it is simply the way in. Held
 * ⇧ opens the call beside the current page instead of in its place, so it
 * can sit next to the thing it is about.
 * The same ensure-then-join as `useStartCall`, through the service client
 * an action is handed.
 */
export const CallAboutAction: Action = {
  title: "Call about this",
  description: "Start or join a video call with your team about this (⇧: to the side)",
  icon: Video,
  conditions: [{ type: "nopartner" }],
  collections: ["talk"],
  execute: async ({ services, state, navigate, tabs, modifiers }) => {
    const open = (id: string, title: string) => {
      const to = callLink(id, { join: true });
      if (modifiers.shiftKey) tabs.openBeside(to, { label: title, evict: true });
      else navigate(to);
    };

    const call = state.left.find((structure) => structure.identifier === CALL_IDENTIFIER);
    if (call) {
      open(call.id, call.label ?? "Call");
      return;
    }

    const client = services.lovekit.client as ApolloClient<NormalizedCache>;
    if (!client) throw new Error("Lovekit is not available");

    const about = toStructureInputs(state.left);
    if (about.length === 0) throw new Error("None of the selected objects can be called about");

    const result = await client.mutate<EnsureCallMutation, EnsureCallMutationVariables>({
      mutation: EnsureCallDocument,
      variables: { input: { about, title: callTitle(state.left) } },
      refetchQueries: ["ListCalls"],
    });
    const created = result.data?.ensureCall;
    if (!created) throw new Error("No call came back");
    open(created.id, created.title);
  },
};

export const LOVEKIT_ACTIONS: Record<string, Action> = {
  call_about: CallAboutAction,
};
