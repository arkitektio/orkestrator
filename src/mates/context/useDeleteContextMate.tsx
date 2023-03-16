import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import {
  MyContextsDocument,
  MyContextsQuery,
  MyContextsQueryVariables,
  MyOmeroFilesDocument,
  useDeleteContextMutation,
} from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { buildDeleteMate } from "../generics/buildDeleteMate";
import { MateFinder } from "../types";

export const useDeleteContextMate = buildDeleteMate(
  withMikro(useDeleteContextMutation)
);
