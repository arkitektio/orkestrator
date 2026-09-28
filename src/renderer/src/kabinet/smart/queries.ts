import {
  AllPrimaryDefinitionsQueryVariables,
  PortDemandInput as KabinetPortDemandInput,
} from "@/kabinet/api/graphql";
import {
  AllActionsQueryVariables,
  DemandKind,
  PortKind,
  type PortDemandInput,
} from "@/rekuest/api/graphql";
import type { SearchOptions } from "@/rekuest/smart/queries";

/**
 * Kabinet's generated `PortDemandInput` is field-for-field rekuest's, with its
 * own copies of the enums (same string values — pinned by `queries.test.ts`),
 * so rekuest's demand builder serves kabinet's definition search too.
 */
export const toKabinetDemands = (
  demands: readonly PortDemandInput[],
): KabinetPortDemandInput[] => demands as unknown as KabinetPortDemandInput[];

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
