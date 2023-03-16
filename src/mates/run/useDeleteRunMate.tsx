import { useDeleteRunMutation } from "../../fluss/api/graphql";
import { withFluss } from "../../fluss/fluss";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteRunMate = buildDeleteMate(
  withFluss(useDeleteRunMutation)
);
