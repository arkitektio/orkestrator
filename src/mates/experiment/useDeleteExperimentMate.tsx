import {
  useDeleteDatasetMutation,
  useDeleteExperimentMutation,
  useDeleteSampleMutation,
} from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteExperimentMate = buildDeleteMate(
  withMikro(useDeleteExperimentMutation)
);
