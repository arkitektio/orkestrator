import { Guard } from "@/app/Arkitekt";
import {
  ListDefinitionFragment,
  useAllPrimaryDefinitionsQuery,
} from "@/kabinet/api/graphql";
import { useAllActionsQuery } from "@/rekuest/api/graphql";
import { Download } from "lucide-react";
import React from "react";
import { toKabinetDemands, useSmartDemands } from "@/providers/smart/extensions/demands";
import type { SectionItems, SmartContextSection, SmartSectionContext } from "@/providers/smart/extensions/section";
import { SectionHost } from "@/providers/smart/extensions/SectionHost";
import type { PassDownProps } from "@/providers/smart/extensions/types";
import { useStableData } from "@/providers/smart/extensions/useStableData";
import { InstallAction, InstallButton } from "./definitions";
import { KABINET_ENGINES_VARIABLES, definitionsVariables } from "./queries";

type InstallItem = { definition: ListDefinitionFragment; action: InstallAction };

/**
 * Definitions that could be installed to act on the selection, one row per
 * (definition, installer action). The installers are fixed per deployment
 * and read `cache-first`; with none there is nothing to offer, so the
 * definitions query is skipped.
 */
const useInstallItems = (ctx: SmartSectionContext): SectionItems<InstallItem> => {
  const demands = useSmartDemands(ctx);
  const engines = useAllActionsQuery({
    variables: KABINET_ENGINES_VARIABLES,
    fetchPolicy: "cache-first",
  });
  const installers = engines.data?.actions;
  const skip = installers !== undefined && installers.length === 0;
  const definitions = useAllPrimaryDefinitionsQuery({
    variables: definitionsVariables(toKabinetDemands(demands.single), { search: ctx.filter }),
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    skip,
  });
  const stable = useStableData(definitions, skip);

  const items = React.useMemo(() => {
    if (!installers || !stable.data) return undefined;
    return stable.data.definitions.flatMap((definition) =>
      installers.map((action) => ({ definition, action: action as InstallAction })),
    );
  }, [installers, stable.data]);

  const status = engines.error
    ? "error"
    : !installers
      ? "loading"
      : stable.status;
  return { items, status, error: engines.error ?? stable.error };
};

export const KABINET_DEFINITIONS_SECTION: SmartContextSection<InstallItem> = {
  id: "kabinet.definitions",
  module: "kabinet",
  title: "Installable",
  icon: Download,
  priority: 50,
  tier: "remote",
  Guard: Guard.Kabinet,
  applies: () => true,
  useItems: useInstallItems,
  itemKey: (item) => `${item.definition.id}-${item.action.id}`,
  searchParts: (item) => [item.definition.name, item.definition.description],
  Row: ({ item }) => (
    <InstallButton definition={item.definition} action={item.action}>
      {item.definition.name}
    </InstallButton>
  ),
};

export const KABINET_SECTIONS: SmartContextSection<any>[] = [KABINET_DEFINITIONS_SECTION];

export const ApplicableDefinitions = (props: PassDownProps) => (
  <SectionHost section={KABINET_DEFINITIONS_SECTION} context={props} />
);
