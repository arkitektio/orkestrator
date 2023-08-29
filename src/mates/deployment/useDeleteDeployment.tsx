import { withPort } from "../../port/PortContext";
import { useDeleteDeploymentMutation } from "../../port/api/graphql";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteDeployment = buildDeleteMate(
  withPort(useDeleteDeploymentMutation)
);
