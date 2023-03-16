import { useDeleteWorkspaceMutation } from "../../fluss/api/graphql";
import { withPort } from "../../port/PortContext";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteScan = buildDeleteMate(
  withPort(useDeleteWorkspaceMutation)
);
