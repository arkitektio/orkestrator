import { registry as localActionRegistry } from "@/app/localactions";
import {
  Action,
  ActionState,
  getActionsForState,
} from "@/lib/localactions/LocalActionProvider";
import { Structure } from "@/types";

export * from "./dragPayload";

export const getMatchingActions = async (
  objects: Structure[],
  partners: Structure[],
): Promise<Action[]> => {
  const state: ActionState = {
    left: objects,
    right: partners,
    isCommand: false,
  };

  return getActionsForState(localActionRegistry, state);
};
