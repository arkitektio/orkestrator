import {
  SmartDefinitionsQueryVariables,
  PortDemandInput as KabinetPortDemandInput,
} from "@/kabinet/api/graphql";
import type { PortDemandInput } from "@/rekuest/api/graphql";
import { demandsField, limitFor, type SearchOptions } from "@/rekuest/smart/queries";

/**
 * Kabinet's generated `PortDemandInput` is field-for-field rekuest's, with its
 * own copies of the enums (same string values — pinned by `queries.test.ts`),
 * so rekuest's demand builder serves kabinet's definition search too.
 */
export const toKabinetDemands = (
  demands: readonly PortDemandInput[],
): KabinetPortDemandInput[] => demands as unknown as KabinetPortDemandInput[];

export const SMART_DEFINITION_LIMIT = 12;

/** The collection the menu is narrowed to, as rekuest's `ActionScopeOptions.collection`. */
export type DefinitionScopeOptions = {
  collection?: string;
};

/**
 * What is left to install for the selection: a definition already deployed in
 * the organization is offered under Run (its action is live), not again here.
 *
 * Built as rekuest's `actionsVariables` is, from the same rekuest demands: the
 * selection's alone, or with the page's related contexts ORed in
 * (`anyDemands`), one limit per set.
 */
export const definitionsVariables = (
  demands: PortDemandInput[],
  options: SearchOptions & DefinitionScopeOptions = {},
): SmartDefinitionsQueryVariables => {
  const field = demandsField(demands, options.alsoDemands);
  return {
    filters: {
      ...("anyDemands" in field
        ? { anyDemands: field.anyDemands.map(toKabinetDemands) }
        : { demands: toKabinetDemands(field.demands) }),
      alreadyDeployed: false,
      ...(options.search ? { search: options.search } : {}),
      ...(options.collection ? { inCollection: options.collection } : {}),
    },
    pagination: { limit: limitFor(SMART_DEFINITION_LIMIT, options, demands) },
  };
};
