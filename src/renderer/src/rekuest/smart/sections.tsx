import { RekuestGuard } from "@/rekuest/api/hooks";
import {
  ListShortcutFragment,
  AllPrimaryActionsDocument,
  OpenableBlokFragment,
  OpenableBloksDocument,
  PrimaryActionFragment,
  ShortcutsDocument,
  useAllPrimaryActionsQuery,
  useOpenableBloksQuery,
  useShortcutsQuery,
} from "@/rekuest/api/graphql";
import { AppWindow, Boxes, PlayCircle, ShieldCheck, Zap } from "lucide-react";
import { buildDemands, useSmartDemands } from "@/rekuest/smart/demands";
import { supervisorOf } from "@/rekuest/smart/agent";
import type {
  SectionItems,
  SmartContextSection,
  SmartSectionContext,
} from "@/core/smart/extensions/section";
import type { SmartContextProps } from "@/core/smart/extensions/types";
import { useStableData } from "@/core/smart/extensions/useStableData";
import { AssignButton, BatchAssignButton } from "./actions";
import { OpenInBlokRow } from "./bloks";
import { actionsVariables, openableBloksVariables, shortcutsVariables } from "./queries";
import { ShortcutButton } from "./shortcuts";

/**
 * The rekuest sections of the smart context menu: Shortcuts, Run, Batch
 * for a multi-selection, and Tailored Interfaces (the bloks whose args take the selection). No section lists implementations: an action row runs
 * on whichever agent can take it, and a stateful one with several asks which
 * (`AssignButton`, the "Run on" picker).
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

/**
 * The supervisor of a selection that is one agent naming one: its actions on
 * the agent are that agent's "supervisor actions" (stop, start, restart, …).
 */
const selectionSupervisor = (props: Pick<SmartContextProps, "objects">) =>
  props.objects.length === 1 ? supervisorOf(props.objects[0]) : undefined;

const useActionItems = (ctx: SmartSectionContext): SectionItems<PrimaryActionFragment> => {
  const demands = useSmartDemands(ctx);
  const skip = demands.single.length === 0;
  const result = useAllPrimaryActionsQuery({
    ...QUERY_OPTIONS,
    variables: actionsVariables(demands.single, {
      search: ctx.filter,
      collection: ctx.collection,
      exceptApp: selectionSupervisor(ctx),
    }),
    skip,
  });
  const stable = useStableData(result, skip);
  return { items: stable.data?.actions, status: stable.status, error: stable.error };
};

const useSupervisorItems = (ctx: SmartSectionContext): SectionItems<PrimaryActionFragment> => {
  const demands = useSmartDemands(ctx);
  const supervisor = selectionSupervisor(ctx);
  const skip = !supervisor || demands.single.length === 0;
  const result = useAllPrimaryActionsQuery({
    ...QUERY_OPTIONS,
    variables: actionsVariables(demands.single, { search: ctx.filter, app: supervisor }),
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

const actionParts = (action: PrimaryActionFragment) => [action.name, action.description];

// Only a selection: a blok is opened FOR something, never to make a return type.
const useOpenableBlokItems = (ctx: SmartSectionContext): SectionItems<OpenableBlokFragment> => {
  const demands = useSmartDemands(ctx);
  const skip = ctx.objects.length === 0;
  const result = useOpenableBloksQuery({
    ...QUERY_OPTIONS,
    variables: openableBloksVariables(demands.single, { search: ctx.filter }),
    skip,
  });
  const stable = useStableData(result, skip);
  return { items: stable.data?.materializedBloks, status: stable.status, error: stable.error };
};

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
      variables: actionsVariables(buildDemands(target).single, {
        collection: target.collection,
        exceptApp: selectionSupervisor(target),
      }),
    },
  ],
};

export const REKUEST_SUPERVISOR_SECTION: SmartContextSection<PrimaryActionFragment> = {
  id: "rekuest.supervisor",
  module: "rekuest",
  title: "Supervisor",
  icon: ShieldCheck,
  priority: 35,
  tier: "remote",
  Guard: RekuestGuard,
  applies: (props) => selectionSupervisor(props) !== undefined,
  useItems: useSupervisorItems,
  itemKey: (action) => action.id,
  searchParts: actionParts,
  Row: ({ item, context }) => <AssignButton action={item} {...context} />,
  prefetch: (target) => {
    const supervisor = selectionSupervisor(target);
    return supervisor
      ? [
          {
            service: "rekuest",
            name: "supervisor",
            query: AllPrimaryActionsDocument,
            variables: actionsVariables(buildDemands(target).single, { app: supervisor }),
          },
        ]
      : [];
  },
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

export const REKUEST_BLOKS_SECTION: SmartContextSection<OpenableBlokFragment> = {
  id: "rekuest.bloks",
  palette: true,
  module: "rekuest",
  title: "Tailored Interfaces",
  icon: AppWindow,
  priority: 45,
  tier: "remote",
  Guard: RekuestGuard,
  applies: (props) => props.objects.length > 0,
  useItems: useOpenableBlokItems,
  itemKey: (blok) => blok.id,
  searchParts: (blok) => [blok.name, blok.blok.name, blok.description, blok.blok.description],
  Row: ({ item, context }) => <OpenInBlokRow blok={item} {...context} />,
  prefetch: (target) =>
    target.objects.length > 0
      ? [
          {
            service: "rekuest",
            name: "bloks",
            query: OpenableBloksDocument,
            variables: openableBloksVariables(buildDemands(target).single),
          },
        ]
      : [],
};

export const REKUEST_SECTIONS: SmartContextSection<any>[] = [
  REKUEST_SHORTCUTS_SECTION,
  REKUEST_SUPERVISOR_SECTION,
  REKUEST_ACTIONS_SECTION,
  REKUEST_BATCH_ACTIONS_SECTION,
  REKUEST_BLOKS_SECTION,
];

/* Standalone forms, for callers that compose sections themselves (the palette). */
