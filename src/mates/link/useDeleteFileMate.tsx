import {
  useDeleteLinkMutation,
  useDeleteOmeroFileMutation,
} from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteLinkMate = buildDeleteMate(
  withMikro(useDeleteLinkMutation)
);
