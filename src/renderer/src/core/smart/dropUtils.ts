import { smartActions } from "./hostRegistries";
import {
  Action,
  ActionState,
  getActionsForState,
} from "@/core/smart/localactions/LocalActionProvider";
import { Structure } from "@/core/types";

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

  return getActionsForState(smartActions(), state);
};
