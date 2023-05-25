import { usePinWorkspaceMutation } from "../../fluss/api/graphql";
import { withFluss } from "../../fluss/fluss";
import { buildPinMate } from "../generics/buildPinMate";

export const usePinWorkspaceMate = buildPinMate(
  withFluss(usePinWorkspaceMutation)
);
