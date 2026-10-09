import type { ApolloClient } from "@apollo/client";

import {
  AddToCallDocument,
  type AddToCallMutation,
  type AddToCallMutationVariables,
} from "@/lovekit/api/graphql";
import { toStructureInputs } from "./structureInput";

export const CALL_IDENTIFIER = "@lovekit/call";

/**
 * Turn a call to these structures: they become what it is talking about, and
 * what it was about stays (one it was about before moves back to the front
 * of the conversation). One implementation behind the "Add to the call" local action and the drop on
 * the call itself (`CallDropTarget`). The answer and lovekit's `calls`
 * subscription put the new topics into the cache, here and for everyone else.
 */
export const addToCall = async (
  client: ApolloClient<any>,
  call: { id: string },
  structures: readonly { identifier: string; id?: string | number | null }[],
) => {
  // A call is not a topic of a call.
  const about = toStructureInputs(structures.filter((structure) => structure.identifier !== CALL_IDENTIFIER));
  if (about.length === 0) throw new Error("That cannot be added to a call");

  const result = await client.mutate<AddToCallMutation, AddToCallMutationVariables>({
    mutation: AddToCallDocument,
    variables: { input: { call: call.id, about } },
  });
  const updated = result.data?.addToCall;
  if (!updated) throw new Error("The call did not answer");
  return updated;
};
