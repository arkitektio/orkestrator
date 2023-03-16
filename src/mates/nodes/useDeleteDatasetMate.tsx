import { withMikro } from "../../mikro/MikroContext";
import { useDeleteNodeMutation } from "../../rekuest/api/graphql";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteNodeMate = buildDeleteMate(
  withMikro(useDeleteNodeMutation)
);
