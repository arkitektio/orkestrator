import { KraphGuard } from "@/kraph/api/funcs";
import {
  ListMeasurementCategoryWithGraphFragment,
  useListApplicableMeasurementCategoriesQuery,
} from "@/kraph/api/graphql";
import { Ruler } from "lucide-react";
import React from "react";
import type {
  SectionItems,
  SmartContextSection,
  SmartSectionContext,
} from "@/core/smart/extensions/section";
import { useStableData } from "@/core/smart/extensions/useStableData";
import { smartRegistry } from "@/core/smart/registry";
import { useRecentTerms, type RecentTerm } from "@/kraph/lib/recentTerms";
import { CreateMeasurementButton, MeasureRecentTermRow } from "./relations";

/**
 * The kraph section: what you can record about the thing you picked (Measures).
 * Relating a pair is a local action (`RelateEntitiesAction`, `RelateDataAction`):
 * it names a word, so there is no list of categories to offer here.
 */

const QUERY_OPTIONS = {
  fetchPolicy: "cache-and-network",
  nextFetchPolicy: "cache-first",
} as const;

const searchVariables = (search: string | undefined) => (search ? { search } : {});

/* ---------------------------------------------------------------- measures */

/**
 * Two kinds of row: the words you last measured a datum as (`MeasureTermAction`
 * records them; local, so they paint before the query answers) and the
 * measurement categories the graphs declare for this kind of datum.
 */
type MeasurementItem =
  | { kind: "recent"; term: RecentTerm }
  | { kind: "category"; category: ListMeasurementCategoryWithGraphFragment };

const recentMatches = (term: RecentTerm, filter: string | undefined) => {
  if (!filter) return true;
  const needle = filter.toLowerCase();
  return (
    term.key.toLowerCase().includes(needle) ||
    (term.label ?? "").toLowerCase().includes(needle) ||
    (term.measure?.key ?? "").toLowerCase().includes(needle) ||
    (term.measure?.label ?? "").toLowerCase().includes(needle)
  );
};

const useMeasurementItems = (ctx: SmartSectionContext): SectionItems<MeasurementItem> => {
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

  // The same reach as `MeasureTermAction`: data, with no partner.
  const recents = useRecentTerms().terms;
  const measurable = !skip && ctx.objects.every((object) => smartRegistry.isDatum(object.identifier));

  const items = React.useMemo<MeasurementItem[] | undefined>(() => {
    const recentRows: MeasurementItem[] = measurable
      ? recents
          .filter((term) => recentMatches(term, ctx.filter))
          .map((term) => ({ kind: "recent", term }))
      : [];
    const categories = stable.data?.measurementCategories;
    if (!categories && recentRows.length === 0) return undefined;
    return [
      ...recentRows,
      ...(categories ?? []).map((category) => ({ kind: "category" as const, category })),
    ];
  }, [measurable, recents, ctx.filter, stable.data]);

  return { items, status: stable.status, error: stable.error };
};

export const KRAPH_MEASUREMENTS_SECTION: SmartContextSection<MeasurementItem> = {
  id: "kraph.measurements",
  module: "kraph",
  title: "Measures",
  icon: Ruler,
  priority: 30,
  tier: "remote",
  Guard: KraphGuard,
  applies: (props) => props.objects.length > 0 && !(props.partners?.length ?? 0),
  useItems: useMeasurementItems,
  itemKey: (item) =>
    item.kind === "recent"
      ? `recent:${item.term.measure?.key ?? ""}:${item.term.key}`
      : item.category.id,
  searchParts: (item) =>
    item.kind === "recent"
      ? [
          item.term.label ?? "",
          item.term.key,
          item.term.measure?.label ?? "",
          item.term.measure?.key ?? "",
        ]
      : [item.category.label, item.category.graph.name],
  Row: ({ item, context }) =>
    item.kind === "recent" ? (
      <MeasureRecentTermRow term={item.term} left={context} />
    ) : (
      <CreateMeasurementButton category={item.category} left={context}>
        {item.category.graph.name}
      </CreateMeasurementButton>
    ),
};

export const KRAPH_SECTIONS: SmartContextSection<any>[] = [KRAPH_MEASUREMENTS_SECTION];
