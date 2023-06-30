import { useDeleteGraphMutation } from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteGraphMate = buildDeleteMate(
  withMikro(useDeleteGraphMutation)
);
