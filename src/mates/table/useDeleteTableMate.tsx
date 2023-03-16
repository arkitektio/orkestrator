import {
  useDeleteDatasetMutation,
  useDeleteExperimentMutation,
  useDeleteSampleMutation,
  useDeleteTableMutation,
} from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteTableMate = buildDeleteMate(
  withMikro(useDeleteTableMutation)
);
