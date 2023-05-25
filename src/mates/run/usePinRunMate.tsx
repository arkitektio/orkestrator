import { usePinRunMutation } from "../../fluss/api/graphql";
import { withFluss } from "../../fluss/fluss";
import { buildPinMate } from "../generics/buildPinMate";

export const usePinRunMate = buildPinMate(withFluss(usePinRunMutation));
