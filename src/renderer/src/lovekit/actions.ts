import type { ApolloClient, NormalizedCache } from "@apollo/client";
import { ListPlus, PanelRight, Video } from "lucide-react";

import type { Action, ActionParams } from "@/core/smart/localactions/LocalActionProvider";
import { EnsureCallDocument, type EnsureCallMutation, type EnsureCallMutationVariables } from "@/lovekit/api/graphql";
import { addToCall, CALL_IDENTIFIER } from "./call/addToCall";
import { callLink, callTitle } from "./call/links";
import { toStructureInputs } from "./call/structureInput";

type Open = (id: string, title: string) => void;

/**
 * The live call about the selection, or a new one, and straight into it:
 * the same ensure-then-join as `useStartCall`, through the service client an
 * action is handed. On a call itself it is simply the way in. `open` says
 * where the call's page goes.
 */
const callAbout = async (
  { services, state }: Pick<ActionParams, "services" | "state">,
  open: Open,
) => {
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
};

/** "Call about this": the call's page in this tab. */
export const CallAboutAction: Action = {
  title: "Call about this",
  description: "Start or join a video call with your team about this",
  icon: Video,
  conditions: [{ type: "nopartner" }],
  collections: ["talk"],
  execute: (params) => callAbout(params, (id) => params.navigate(callLink(id, { join: true }))),
};

/**
 * "Call about this to the side": the same call, opened to the right of the
 * page you are on, so it sits with the thing it is about.
 */
export const CallAboutToTheSideAction: Action = {
  title: "Call about this to the side",
  description: "Start or join a video call about this, in a split with this page",
  icon: PanelRight,
  conditions: [{ type: "nopartner" }],
  collections: ["talk"],
  execute: (params) =>
    callAbout(params, (id, title) =>
      params.tabs.openBeside(callLink(id, { join: true }), { label: title, evict: true }),
    ),
};

/**
 * "Add to the call": what was dropped on a call becomes what the call is
 * talking about; what it was about before stays. The drop on the call's own page
 * and rail row (`CallDropTarget`) does the same without the menu.
 */
export const AddToCallAction: Action = {
  title: "Add to the call",
  description: "Turn the call to what you dropped; what it was about before stays",
  icon: ListPlus,
  conditions: [{ type: "identifier", identifier: CALL_IDENTIFIER }, { type: "haspartner" }],
  collections: ["talk"],
  execute: async ({ services, state, onProgress }) => {
    const call = state.left.find((structure) => structure.identifier === CALL_IDENTIFIER);
    if (!call) throw new Error("Drop it onto a call");
    const client = services.lovekit.client as ApolloClient<NormalizedCache>;
    if (!client) throw new Error("Lovekit is not available");
    await addToCall(client, call, state.right ?? []);
    onProgress(100);
  },
};

export const LOVEKIT_ACTIONS: Record<string, Action> = {
  call_about: CallAboutAction,
  call_about_side: CallAboutToTheSideAction,
  call_add: AddToCallAction,
};
