import { useDeleteStageMutation } from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteStageMate = buildDeleteMate(
  withMikro(useDeleteStageMutation)
);
