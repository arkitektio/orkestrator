import {
  AllPrimaryDefinitionsQueryVariables,
  PortDemandInput as KabinetPortDemandInput,
} from "@/kabinet/api/graphql";
import {
  AllActionsQueryVariables,
  DemandKind,
  PortKind,
} from "@/rekuest/api/graphql";
import type { SearchOptions } from "../rekuest/queries";

export const SMART_DEFINITION_LIMIT = 12;

export const definitionsVariables = (
  demands: KabinetPortDemandInput[],
  options: SearchOptions = {},
): AllPrimaryDefinitionsQueryVariables => ({
  filters: { demands, ...(options.search ? { search: options.search } : {}) },
  pagination: { limit: options.limit ?? SMART_DEFINITION_LIMIT },
});

/**
 * The rekuest actions that can install a kabinet definition into a pod. Fixed
 * per deployment, hence a module constant and a `cache-first` query.
 */
export const KABINET_ENGINES_VARIABLES: AllActionsQueryVariables = {
  filters: {
    demands: [
      {
        kind: DemandKind.Args,
        matches: [{ at: 0, kind: PortKind.Structure, identifier: "@kabinet/definition" }],
      },
      {
        kind: DemandKind.Returns,
        matches: [{ at: 0, kind: PortKind.Structure, identifier: "@kabinet/pod" }],
      },
    ],
  },
};
