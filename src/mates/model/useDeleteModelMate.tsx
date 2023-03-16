import {
  useDeleteModelMutation,
  useDeleteSampleMutation,
} from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteModelMate = buildDeleteMate(
  withMikro(useDeleteModelMutation)
);
