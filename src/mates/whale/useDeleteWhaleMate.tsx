import {
  useDeleteModelMutation,
  useDeleteSampleMutation,
} from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { useDeleteWhaleMutation } from "../../port/api/graphql";
import { withPort } from "../../port/PortContext";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteWhaleMate = buildDeleteMate(
  withPort(useDeleteWhaleMutation)
);
