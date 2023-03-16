import { useDeleteOmeroFileMutation } from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteFileMate = buildDeleteMate(
  withMikro(useDeleteOmeroFileMutation)
);
