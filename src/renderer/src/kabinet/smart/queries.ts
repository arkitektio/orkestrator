import {
  SmartDefinitionsQueryVariables,
  PortDemandInput as KabinetPortDemandInput,
} from "@/kabinet/api/graphql";
import type { PortDemandInput } from "@/rekuest/api/graphql";
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

/**
 * What is left to install for the selection: a definition already deployed in
 * the organization is offered under Run (its action is live), not again here.
 */
export const definitionsVariables = (
  demands: KabinetPortDemandInput[],
  options: SearchOptions = {},
): SmartDefinitionsQueryVariables => ({
  filters: {
    demands,
    alreadyDeployed: false,
    ...(options.search ? { search: options.search } : {}),
  },
  pagination: { limit: options.limit ?? SMART_DEFINITION_LIMIT },
});
