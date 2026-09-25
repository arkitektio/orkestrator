import { KraphGuard } from "@/kraph/api/funcs";
import { useDialog } from "@/core/app/dialog";
import { CommandItem } from "@/core/components/ui/command";
import {
  ListCandidateRelationCategoriesQuery,
  ListMeasurementCategoryWithGraphFragment,
  ListStructureRelationCategoryWithGraphFragment,
  useGetDetailInstanceQuery,
  useListApplicableMeasurementCategoriesQuery,
  useListCandidateRelationCategoriesQuery,
  useListCandidateStructureRelationCategoriesQuery,
} from "@/kraph/api/graphql";
import {
  useApplicableRelationCategories,
  useApplicableStructureRelationCategories,
} from "@/kraph/lib/applicableCategories";
import { GitBranchPlus, Network, Ruler } from "lucide-react";
import React from "react";
import type {
  SectionItems,
  SectionStatus,
  SmartContextSection,
  SmartSectionContext,
} from "@/core/providers/smart/extensions/section";
import type { SmartContextProps } from "@/core/providers/smart/extensions/types";
import { useStableData } from "@/core/providers/smart/extensions/useStableData";
import {
  CreateMeasurementButton,
  EntityRelateButton,
  StructureRelateButton,
} from "./relations";

/**
 * The kraph sections: what you can record about the thing you picked
 * (Measures), or about the pair you dragged together (Relate). Which of the
 * three applies is decided by `applies`, once, from the two ends' identifiers.
 *
 * Candidates come from the graph's schema; admission is the server's
 * `matchesDescriptor`, probed per distinct descriptor
 * (`kraph/lib/applicableCategories.ts`). The candidates are read through
 * `useStableData` so a search refetch does not empty the probe's input — its
 * key is the joined ids, which stay put until the new list lands.
 */

const QUERY_OPTIONS = {
  fetchPolicy: "cache-and-network",
  nextFetchPolicy: "cache-first",
} as const;

const searchVariables = (search: string | undefined) => (search ? { search } : {});

const bothEntities = (props: SmartContextProps) =>
  props.objects.at(0)?.identifier === "@kraph/entity" &&
  props.partners?.at(0)?.identifier === "@kraph/entity";

/** The probe's status, once its candidates are here. */
const probeStatus = (
  candidates: SectionStatus,
  probe: { applicable: readonly unknown[]; loading: boolean; error?: Error },
): SectionStatus => {
  if (candidates !== "ready") return candidates;
  if (probe.error) return "error";
  if (probe.loading) return probe.applicable.length ? "revalidating" : "loading";
  return "ready";
};

/* ---------------------------------------------------------------- measures */

const useMeasurementItems = (
  ctx: SmartSectionContext,
): SectionItems<ListMeasurementCategoryWithGraphFragment> => {
  const firstObject = ctx.objects.at(0);
  const skip = !firstObject || (ctx.partners?.length ?? 0) > 0;
  const result = useListApplicableMeasurementCategoriesQuery({
    ...QUERY_OPTIONS,
    variables: {
      ...searchVariables(ctx.filter),
      sourceIdentifier: firstObject?.identifier ?? "",
    },
    skip,
  });
  const stable = useStableData(result, skip);
  return { items: stable.data?.measurementCategories, status: stable.status, error: stable.error };
};

export const KRAPH_MEASUREMENTS_SECTION: SmartContextSection<ListMeasurementCategoryWithGraphFragment> = {
  id: "kraph.measurements",
  module: "kraph",
  title: "Measures",
  icon: Ruler,
  priority: 30,
  tier: "remote",
  Guard: KraphGuard,
  applies: (props) => props.objects.length > 0 && !(props.partners?.length ?? 0),
  useItems: useMeasurementItems,
  itemKey: (category) => category.id,
  searchParts: (category) => [category.label, category.graph.name],
  Row: ({ item, context }) => (
    <CreateMeasurementButton category={item} left={context}>
      {item.graph.name}
    </CreateMeasurementButton>
  ),
};

/* --------------------------------------------------------- entity ↔ entity */

type RelationCandidate = ListCandidateRelationCategoriesQuery["relationCategories"][number];

const NO_CANDIDATES: readonly RelationCandidate[] = [];

/**
 * Both ends arrive as bare uuids, and which relation categories apply depends
 * on the two entities' *categories* — which are view-grain and so exist only
 * inside a graph. `instance(id:) { drawnIn }` bridges that: it says which
 * views draw each claim and under which category. A relation is offered only
 * for a graph that draws both ends, which is also the only graph that could
 * record it.
 */
const useEntityRelationItems = (ctx: SmartSectionContext): SectionItems<RelationCandidate> => {
  const object = ctx.objects.at(0);
  const partner = ctx.partners?.at(0);

  const source = useGetDetailInstanceQuery({
    variables: { id: object?.id ?? "" },
    skip: !object,
  });
  const target = useGetDetailInstanceQuery({
    variables: { id: partner?.id ?? "" },
    skip: !partner,
  });

  // The first graph that draws both. Two claims with no view in common cannot
  // be related there, and saying so by offering nothing is the honest answer.
  const shared = React.useMemo(() => {
    const targets = new Map(
      (target.data?.instance.drawnIn ?? []).map((drawing) => [drawing.graph.id, drawing]),
    );
    for (const drawing of source.data?.instance.drawnIn ?? []) {
      const counterpart = targets.get(drawing.graph.id);
      if (counterpart) {
        return {
          graphId: drawing.graph.id,
          sourceCategoryId: drawing.category.id,
          targetCategoryId: counterpart.category.id,
        };
      }
    }
    return undefined;
  }, [source.data, target.data]);

  const skip = !shared;
  const result = useListCandidateRelationCategoriesQuery({
    ...QUERY_OPTIONS,
    variables: searchVariables(ctx.filter),
    skip,
  });
  const candidates = useStableData(result, skip);
  const inGraph = React.useMemo(
    () =>
      (candidates.data?.relationCategories ?? NO_CANDIDATES).filter(
        (category) => category.graph.id === shared?.graphId,
      ),
    [candidates.data, shared],
  );
  const probe = useApplicableRelationCategories(
    inGraph,
    shared?.sourceCategoryId,
    shared?.targetCategoryId,
  );

  const endsError = source.error ?? target.error;
  const endsLoading = (source.loading && !source.data) || (target.loading && !target.data);
  const status: SectionStatus = endsError
    ? "error"
    : endsLoading
      ? "loading"
      : !shared
        ? "ready"
        : probeStatus(candidates.status, probe);

  return {
    items: shared ? probe.applicable : NO_CANDIDATES,
    status,
    error: endsError ?? candidates.error ?? probe.error,
  };
};

export const KRAPH_ENTITY_RELATIONS_SECTION: SmartContextSection<RelationCandidate> = {
  id: "kraph.entityRelations",
  module: "kraph",
  title: "Relate",
  icon: Network,
  priority: 31,
  tier: "remote",
  Guard: KraphGuard,
  applies: bothEntities,
  useItems: useEntityRelationItems,
  itemKey: (category) => category.id,
  searchParts: (category) => [category.label, category.graph.name],
  Row: ({ item, context }) => (
    <EntityRelateButton
      category={item}
      source={context.objects[0]}
      target={context.partners![0]}
    />
  ),
};

/* ----------------------------------------------------- structure ↔ structure */

type StructureRelationItem =
  | { kind: "relate"; category: ListStructureRelationCategoryWithGraphFragment }
  | { kind: "create" };

const CREATE_ROW: StructureRelationItem = { kind: "create" };

const useStructureRelationItems = (
  ctx: SmartSectionContext,
): SectionItems<StructureRelationItem> => {
  const firstObject = ctx.objects.at(0);
  const firstPartner = ctx.partners?.at(0);
  const skip = !firstObject || !firstPartner;

  const result = useListCandidateStructureRelationCategoriesQuery({
    ...QUERY_OPTIONS,
    variables: searchVariables(ctx.filter),
    skip,
  });
  const candidates = useStableData(result, skip);

  // `StructureRelationCategoryFilter` has no `sourceIdentifier` /
  // `targetIdentifier` (only `MeasurementCategoryFilter` kept one), so
  // admission is probed against the two structure kinds instead.
  const probe = useApplicableStructureRelationCategories(
    candidates.data?.structureRelationCategories,
    firstObject?.identifier,
    firstPartner?.identifier,
  );

  const items = React.useMemo<StructureRelationItem[]>(
    () => [
      ...probe.applicable.map((category) => ({ kind: "relate" as const, category })),
      CREATE_ROW,
    ],
    [probe.applicable],
  );

  return {
    items,
    status: probeStatus(candidates.status, probe),
    error: candidates.error ?? probe.error,
  };
};

const CreateRelationRow = ({ context }: { context: SmartSectionContext }) => {
  const dialog = useDialog();
  return (
    <CommandItem
      value="no-relation"
      onSelect={() =>
        dialog.openDialog("createnewrelation", {
          left: context.objects,
          right: context.partners || [],
        })
      }
      className="flex-1"
    >
      <GitBranchPlus className="mr-2 h-4 w-4" />
      Create new Relation
    </CommandItem>
  );
};

export const KRAPH_STRUCTURE_RELATIONS_SECTION: SmartContextSection<StructureRelationItem> = {
  id: "kraph.structureRelations",
  module: "kraph",
  title: "Relate",
  icon: Network,
  priority: 32,
  tier: "remote",
  Guard: KraphGuard,
  applies: (props) => (props.partners?.length ?? 0) > 0 && !bothEntities(props),
  useItems: useStructureRelationItems,
  itemKey: (item) => (item.kind === "relate" ? item.category.id : "no-relation"),
  searchParts: (item) =>
    item.kind === "relate" ? [item.category.label, item.category.graph.name] : ["Create new Relation"],
  Row: ({ item, context }) =>
    item.kind === "relate" ? (
      <StructureRelateButton category={item.category} right={context.partners![0]} left={context}>
        {item.category.label}
      </StructureRelateButton>
    ) : (
      <CreateRelationRow context={context} />
    ),
};

export const KRAPH_SECTIONS: SmartContextSection<any>[] = [
  KRAPH_MEASUREMENTS_SECTION,
  KRAPH_ENTITY_RELATIONS_SECTION,
  KRAPH_STRUCTURE_RELATIONS_SECTION,
];
