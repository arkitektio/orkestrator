import { useDeleteWorkspaceMutation } from "../../fluss/api/graphql";
import { withFluss } from "../../fluss/fluss";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteWorkspaceMate = buildDeleteMate(
  withFluss(useDeleteWorkspaceMutation)
);
