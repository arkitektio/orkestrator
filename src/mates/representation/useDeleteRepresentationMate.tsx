import {
  useDeleteRepresentationMutation,
  useDeleteSampleMutation,
} from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteRepresentationMate = buildDeleteMate(
  withMikro(useDeleteRepresentationMutation)
);
