import { KabinetGuard } from "@/kabinet/api/hooks";
import {
  SmartDefinitionFragment,
  SmartDefinitionsDocument,
  useSmartDefinitionsQuery,
} from "@/kabinet/api/graphql";
import { Download } from "lucide-react";
import React from "react";
import { buildDemands, useSmartDemands } from "@/rekuest/smart/demands";
import type {
  SectionItems,
  SectionStatus,
  SmartContextSection,
  SmartSectionContext,
} from "@/core/smart/extensions/section";
import { useStableData } from "@/core/smart/extensions/useStableData";
import { InstallDefinitionRow } from "./definitions";
import { definitionsVariables, toKabinetDemands } from "./queries";

const QUERY_OPTIONS = {
  fetchPolicy: "cache-and-network",
  nextFetchPolicy: "cache-first",
} as const;

/** The worse of two section states: an error, then a first load, then a refetch. */
const STATUS_RANK: Record<SectionStatus, number> = {
  ready: 0,
  revalidating: 1,
  loading: 2,
  error: 3,
};
const worse = (a: SectionStatus, b: SectionStatus) => (STATUS_RANK[a] >= STATUS_RANK[b] ? a : b);

/**
 * Definitions that could be installed to act on the selection, one row each;
 * choosing one opens the install dialog for its release (authorize, then
 * deploy). They are asked for with the demands the Run section uses,
 * descriptors included, so kabinet offers only what the selection's ports
 * accept. A multi-selection also asks for definitions that take one item
 * (rekuest's Batch): installing consumes nothing, so a definition run per
 * item is as much an answer as one taking the list.
 */
const useInstallItems = (ctx: SmartSectionContext): SectionItems<SmartDefinitionFragment> => {
  const demands = useSmartDemands(ctx);
  const skipBatch = demands.objects !== "many";

  const single = useStableData(
    useSmartDefinitionsQuery({
      ...QUERY_OPTIONS,
      variables: definitionsVariables(toKabinetDemands(demands.single), { search: ctx.filter }),
    }),
  );
  const batch = useStableData(
    useSmartDefinitionsQuery({
      ...QUERY_OPTIONS,
      variables: definitionsVariables(toKabinetDemands(demands.batch), { search: ctx.filter }),
      skip: skipBatch,
    }),
    skipBatch,
  );

  const items = React.useMemo(() => {
    if (!single.data) return undefined;
    const seen = new Set<string>();
    return [...single.data.definitions, ...(batch.data?.definitions ?? [])].filter(
      (definition) => !seen.has(definition.id) && !!seen.add(definition.id),
    );
  }, [single.data, batch.data]);

  return {
    items,
    status: worse(single.status, batch.status),
    error: single.error ?? batch.error,
  };
};

export const KABINET_DEFINITIONS_SECTION: SmartContextSection<SmartDefinitionFragment> = {
  id: "kabinet.definitions",
  palette: true,
  module: "kabinet",
  title: "Installable",
  icon: Download,
  priority: 50,
  tier: "remote",
  Guard: KabinetGuard,
  applies: () => true,
  useItems: useInstallItems,
  itemKey: (definition) => definition.id,
  searchParts: (definition) => [definition.name, definition.description],
  Row: ({ item }) => <InstallDefinitionRow definition={item} />,
  // The variables `useInstallItems` opens with (no search yet).
  prefetch: (target) => {
    const demands = buildDemands(target);
    return [
      {
        service: "kabinet",
        name: "definitions",
        query: SmartDefinitionsDocument,
        variables: definitionsVariables(toKabinetDemands(demands.single)),
      },
      ...(demands.objects === "many"
        ? [
            {
              service: "kabinet",
              name: "batchDefinitions",
              query: SmartDefinitionsDocument,
              variables: definitionsVariables(toKabinetDemands(demands.batch)),
            },
          ]
        : []),
    ];
  },
};

export const KABINET_SECTIONS: SmartContextSection<any>[] = [KABINET_DEFINITIONS_SECTION];
