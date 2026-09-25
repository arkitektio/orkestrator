import { RekuestGuard } from "@/rekuest/api/hooks";
import {
  DetailImplementationFragment,
  ListShortcutFragment,
  AllPrimaryActionsDocument,
  PrimaryActionFragment,
  ShortcutsDocument,
  useAllPrimaryActionsQuery,
  useImplementationsQuery,
  useShortcutsQuery,
} from "@/rekuest/api/graphql";
import { Boxes, PlayCircle, Zap } from "lucide-react";
import { buildDemands, useSmartDemands } from "@/rekuest/smart/demands";
import type {
  SectionItems,
  SmartContextSection,
  SmartSectionContext,
} from "@/core/providers/smart/extensions/section";
import type { SmartContextProps } from "@/core/providers/smart/extensions/types";
import { useStableData } from "@/core/providers/smart/extensions/useStableData";
import {
  AssignButton,
  BatchAssignButton,
  BatchImplementationAssignButton,
  ImplementationAssignButton,
} from "./actions";
import {
  actionsVariables,
  implementationsVariables,
  shortcutsVariables,
} from "./queries";
import { ShortcutButton } from "./shortcuts";

/**
 * The rekuest sections of the smart context menu: Shortcuts, Run,
 * Implementations, and the two batch variants for a multi-selection.
 *
 * Every query runs `cache-and-network` (the menu remounts per open, so cached
 * rows render at once and refresh behind) with `nextFetchPolicy: "cache-first"`
 * (cache broadcasts while open do not hit the network; a search change resets
 * to the initial policy). `useStableData` keeps the previous rows while a
 * search is in flight.
 */

const QUERY_OPTIONS = {
  fetchPolicy: "cache-and-network",
  nextFetchPolicy: "cache-first",
} as const;

/** Something to ask about: a selection, or (for a "new" button) a return type. */
const hasSubject = (props: SmartContextProps) =>
  props.objects.length > 0 || (props.returns?.length ?? 0) > 0;

const useShortcutItems = (ctx: SmartSectionContext): SectionItems<ListShortcutFragment> => {
  const demands = useSmartDemands(ctx);
  const skip = demands.single.length === 0;
  const result = useShortcutsQuery({
    ...QUERY_OPTIONS,
    variables: shortcutsVariables(demands.single, { search: ctx.filter }),
    skip,
  });
  const stable = useStableData(result, skip);
  return { items: stable.data?.shortcuts, status: stable.status, error: stable.error };
};

const useActionItems = (ctx: SmartSectionContext): SectionItems<PrimaryActionFragment> => {
  const demands = useSmartDemands(ctx);
  const skip = demands.single.length === 0;
  const result = useAllPrimaryActionsQuery({
    ...QUERY_OPTIONS,
    variables: actionsVariables(demands.single, {
      search: ctx.filter,
      collection: ctx.collection,
    }),
    skip,
  });
  const stable = useStableData(result, skip);
  return { items: stable.data?.actions, status: stable.status, error: stable.error };
};

const useBatchActionItems = (ctx: SmartSectionContext): SectionItems<PrimaryActionFragment> => {
  const demands = useSmartDemands(ctx);
  const skip = demands.objects !== "many";
  const result = useAllPrimaryActionsQuery({
    ...QUERY_OPTIONS,
    variables: actionsVariables(demands.batch, {
      search: ctx.filter,
      collection: ctx.collection,
    }),
    skip,
  });
  const stable = useStableData(result, skip);
  return { items: stable.data?.actions, status: stable.status, error: stable.error };
};

const useImplementationItems = (
  ctx: SmartSectionContext,
): SectionItems<DetailImplementationFragment> => {
  const demands = useSmartDemands(ctx);
  const skip = demands.single.length === 0;
  const result = useImplementationsQuery({
    ...QUERY_OPTIONS,
    variables: implementationsVariables(demands.implementation, { search: ctx.filter }),
    skip,
  });
  const stable = useStableData(result, skip);
  return { items: stable.data?.implementations, status: stable.status, error: stable.error };
};

const useBatchImplementationItems = (
  ctx: SmartSectionContext,
): SectionItems<DetailImplementationFragment> => {
  const demands = useSmartDemands(ctx);
  const skip = demands.objects !== "many";
  const result = useImplementationsQuery({
    ...QUERY_OPTIONS,
    variables: implementationsVariables(demands.batchImplementation, { search: ctx.filter }),
    skip,
  });
  const stable = useStableData(result, skip);
  return { items: stable.data?.implementations, status: stable.status, error: stable.error };
};

const actionParts = (action: PrimaryActionFragment) => [action.name, action.description];
const implementationParts = (implementation: DetailImplementationFragment) => [
  implementation.action.name,
  implementation.agent.name,
  implementation.interface,
];

export const REKUEST_SHORTCUTS_SECTION: SmartContextSection<ListShortcutFragment> = {
  id: "rekuest.shortcuts",
  palette: true,
  module: "rekuest",
  title: "Shortcuts",
  icon: Zap,
  priority: 20,
  tier: "remote",
  Guard: RekuestGuard,
  applies: hasSubject,
  useItems: useShortcutItems,
  itemKey: (shortcut) => shortcut.id,
  searchParts: (shortcut) => [shortcut.name, shortcut.description],
  Row: ({ item, context }) => <ShortcutButton shortcut={item} {...context} />,
  // The variables `useShortcutItems` opens with (no search yet).
  prefetch: (target) => [
    {
      service: "rekuest",
      name: "shortcuts",
      query: ShortcutsDocument,
      variables: shortcutsVariables(buildDemands(target).single),
    },
  ],
};

export const REKUEST_ACTIONS_SECTION: SmartContextSection<PrimaryActionFragment> = {
  id: "rekuest.actions",
  palette: true,
  module: "rekuest",
  title: "Run",
  icon: PlayCircle,
  priority: 40,
  tier: "remote",
  Guard: RekuestGuard,
  applies: hasSubject,
  useItems: useActionItems,
  itemKey: (action) => action.id,
  searchParts: actionParts,
  Row: ({ item, context }) => <AssignButton action={item} {...context} />,
  // The variables `useActionItems` opens with (no search yet).
  prefetch: (target) => [
    {
      service: "rekuest",
      name: "actions",
      query: AllPrimaryActionsDocument,
      variables: actionsVariables(buildDemands(target).single, { collection: target.collection }),
    },
  ],
};

export const REKUEST_IMPLEMENTATIONS_SECTION: SmartContextSection<DetailImplementationFragment> = {
  id: "rekuest.implementations",
  module: "rekuest",
  title: "Implementations",
  icon: PlayCircle,
  priority: 41,
  tier: "remote",
  Guard: RekuestGuard,
  applies: hasSubject,
  useItems: useImplementationItems,
  itemKey: (implementation) => implementation.id,
  searchParts: implementationParts,
  Row: ({ item, context }) => <ImplementationAssignButton implementation={item} {...context} />,
};

export const REKUEST_BATCH_ACTIONS_SECTION: SmartContextSection<PrimaryActionFragment> = {
  id: "rekuest.batchActions",
  module: "rekuest",
  title: "Batch",
  icon: Boxes,
  priority: 42,
  tier: "remote",
  Guard: RekuestGuard,
  applies: (props) => props.objects.length >= 2,
  useItems: useBatchActionItems,
  itemKey: (action) => action.id,
  searchParts: actionParts,
  Row: ({ item, context }) => <BatchAssignButton action={item} {...context} />,
};

export const REKUEST_BATCH_IMPLEMENTATIONS_SECTION: SmartContextSection<DetailImplementationFragment> = {
  id: "rekuest.batchImplementations",
  module: "rekuest",
  title: "Batch Implementations",
  icon: Boxes,
  priority: 43,
  tier: "remote",
  Guard: RekuestGuard,
  applies: (props) => props.objects.length >= 2,
  useItems: useBatchImplementationItems,
  itemKey: (implementation) => implementation.id,
  searchParts: implementationParts,
  Row: ({ item, context }) => (
    <BatchImplementationAssignButton implementation={item} {...context} />
  ),
};

export const REKUEST_SECTIONS: SmartContextSection<any>[] = [
  REKUEST_SHORTCUTS_SECTION,
  REKUEST_ACTIONS_SECTION,
  REKUEST_IMPLEMENTATIONS_SECTION,
  REKUEST_BATCH_ACTIONS_SECTION,
  REKUEST_BATCH_IMPLEMENTATIONS_SECTION,
];

/* Standalone forms, for callers that compose sections themselves (the palette). */
