import { useMatchingActionEntries, usePinnedActionIds } from "@/app/localactions";
import { Action, orderActionEntries } from "@/lib/localactions/LocalActionProvider";
import { Sparkles } from "lucide-react";
import React from "react";
import type { SectionItems, SmartContextSection, SmartSectionContext } from "../section";
import { LocalActionCommand } from "./localactions";

type LocalActionEntry = { id: string; action: Action };

/**
 * Local actions are a synchronous registry scan, so they use the raw input
 * rather than the debounced server filter and are on screen in the frame the
 * menu opens. Memoized end to end: the rows only change identity when the
 * selection, the pins or the text do.
 */
const useLocalActionItems = (ctx: SmartSectionContext): SectionItems<LocalActionEntry> => {
  const search = ctx.liveFilter ?? ctx.filter;
  const pinnedActionIds = usePinnedActionIds();
  const state = React.useMemo(
    () => ({ left: ctx.objects, right: ctx.partners, isCommand: false }),
    [ctx.objects, ctx.partners],
  );
  const entries = useMatchingActionEntries({ state, search });
  const items = React.useMemo(
    () => orderActionEntries(entries, pinnedActionIds, search),
    [entries, pinnedActionIds, search],
  );
  return { items, status: "ready" };
};

export const LOCAL_ACTIONS_SECTION: SmartContextSection<LocalActionEntry> = {
  id: "local.actions",
  palette: true,
  module: "local",
  title: "Default",
  icon: Sparkles,
  priority: 0,
  tier: "instant",
  applies: () => true,
  useItems: useLocalActionItems,
  itemKey: (entry) => entry.id,
  Row: ({ item, context }) => (
    <LocalActionCommand
      actionId={item.id}
      action={item.action}
      state={{ left: context.objects, right: context.partners, isCommand: false }}
      onDone={context.onDone}
    />
  ),
};

export const LOCAL_SECTIONS: SmartContextSection<any>[] = [LOCAL_ACTIONS_SECTION];
