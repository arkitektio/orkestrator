import { withMikro } from "../../mikro/MikroContext";
import { useDeleteContextMutation } from "../../mikro/api/graphql";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteContextMate = buildDeleteMate(
  withMikro(useDeleteContextMutation)
);
