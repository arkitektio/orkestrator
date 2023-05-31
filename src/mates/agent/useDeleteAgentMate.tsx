import { withRekuest } from "../../rekuest";
import { useDeleteAgentMutation } from "../../rekuest/api/graphql";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteAgentMate = buildDeleteMate(
  withRekuest(useDeleteAgentMutation)
);
