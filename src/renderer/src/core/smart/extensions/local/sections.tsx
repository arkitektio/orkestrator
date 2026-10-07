import {
  registry,
  useMatchingActionEntries,
  usePinnedActionIds,
  useTogglePinnedAction,
} from "@/core/smart/localactions/registry";
import { Action, orderActionEntries } from "@/core/smart/localactions/LocalActionProvider";
import { Share2, Sparkles } from "lucide-react";
import React from "react";
import type {
  SectionItems,
  SectionPins,
  SmartContextSection,
  SmartSectionContext,
} from "../section";
import { usePerformAction } from "@/core/smart/localactions/useLocalAction";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/core/ui/context-menu";
import { InputGroupButton } from "@/core/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
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
  const hasSearchBar = ctx.hasSearchBar === true;
  const items = React.useMemo(
    () =>
      orderActionEntries(
        // In the search field already; a row would say it twice.
        hasSearchBar ? entries.filter((entry) => !(entry.id in SEARCH_BAR_ACTIONS)) : entries,
        pinnedActionIds,
        search,
      ),
    [entries, pinnedActionIds, search, hasSearchBar],
  );
  return { items, status: "ready" };
};

/**
 * The two things done to nearly every object, as buttons in the search field
 * rather than rows: share it, open it. Left to right; an icon here replaces
 * the action's own. A right-click on the button offers its `alternatives`:
 * the other ways of doing the same thing (open elsewhere, share otherwise).
 */
const SEARCH_BAR_ACTIONS: Record<
  string,
  { label?: string; icon?: Action["icon"]; alternatives?: Record<string, string | undefined> }
> = {
  // The "private" link names neither server nor organization: the one to post in public.
  copylink: { label: "Share", icon: Share2, alternatives: { copyprivatelink: "Share public link" } },
  navigate: { alternatives: { opentotheside: "Open to the right", newtab: undefined, popout: undefined } },
};

const useActionState = (context: SmartSectionContext) =>
  React.useMemo(
    () => ({ left: context.objects, right: context.partners, isCommand: false }),
    [context.objects, context.partners],
  );

const AlternativeItem = ({
  entry,
  label,
  context,
}: {
  entry: LocalActionEntry;
  label?: string;
  context: SmartSectionContext;
}) => {
  const state = useActionState(context);
  const { assign, confirmationDialog } = usePerformAction({
    action: entry.action,
    state,
    onDone: context.onDone,
    actionId: entry.id,
  });
  const Icon = entry.action.icon ?? Sparkles;

  return (
    <>
      <ContextMenuItem onSelect={() => void assign()}>
        <Icon className="h-3.5 w-3.5" />
        {label ?? entry.action.title}
      </ContextMenuItem>
      {confirmationDialog}
    </>
  );
};

const SearchBarAction = ({
  entry,
  alternatives,
  context,
}: {
  entry: LocalActionEntry;
  /** The entries behind this button's right-click, already matched. */
  alternatives: LocalActionEntry[];
  context: SmartSectionContext;
}) => {
  const state = useActionState(context);
  const { assign, confirmationDialog } = usePerformAction({
    action: entry.action,
    state,
    onDone: context.onDone,
    actionId: entry.id,
  });
  const config = SEARCH_BAR_ACTIONS[entry.id];
  const Icon = config.icon ?? entry.action.icon ?? Sparkles;
  const name = config.label ?? entry.action.title;

  const button = (
    <InputGroupButton size="icon-xs" aria-label={name} onClick={() => void assign()}>
      <Icon />
    </InputGroupButton>
  );

  return (
    <>
      <Tooltip>
        {alternatives.length > 0 ? (
          <ContextMenu modal={false}>
            <TooltipTrigger asChild>
              <ContextMenuTrigger asChild>{button}</ContextMenuTrigger>
            </TooltipTrigger>
            {/* `data-nonbreaker`: portalled, like the menu it belongs to. */}
            <ContextMenuContent className="dark:border-border" data-nonbreaker>
              {alternatives.map((alternative) => (
                <AlternativeItem
                  key={alternative.id}
                  entry={alternative}
                  label={config.alternatives?.[alternative.id]}
                  context={context}
                />
              ))}
            </ContextMenuContent>
          </ContextMenu>
        ) : (
          <TooltipTrigger asChild>{button}</TooltipTrigger>
        )}
        <TooltipContent>
          {entry.action.description}
          {alternatives.length > 0 ? " · right-click for more" : null}
        </TooltipContent>
      </Tooltip>
      {confirmationDialog}
    </>
  );
};

const LocalSearchBar = ({ context }: { context: SmartSectionContext }) => {
  const state = useActionState(context);
  // No search: the buttons stay whatever is typed.
  const entries = useMatchingActionEntries({ state });
  const byId = (id: string) => entries.find((candidate) => candidate.id === id);
  return (
    <>
      {Object.entries(SEARCH_BAR_ACTIONS).map(([id, config]) => {
        const entry = byId(id);
        if (!entry) return null;
        const alternatives = Object.keys(config.alternatives ?? {})
          .map(byId)
          .filter((candidate): candidate is LocalActionEntry => !!candidate);
        return <SearchBarAction key={id} entry={entry} alternatives={alternatives} context={context} />;
      })}
    </>
  );
};

/**
 * Local actions keep the pin store they always had (Settings → Palette edits
 * the same list). An action declared `pinned` is pinned for good.
 */
const useLocalActionPins = (): SectionPins => {
  const pinnedActionIds = usePinnedActionIds();
  const togglePinnedAction = useTogglePinnedAction();
  return React.useMemo(
    () => ({
      isPinned: (id) => pinnedActionIds.includes(id),
      toggle: (id) => togglePinnedAction(id),
      isLocked: (id) => (registry as Record<string, Action>)[id]?.pinned === true,
      order: (id) => pinnedActionIds.indexOf(id),
    }),
    [pinnedActionIds, togglePinnedAction],
  );
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
  usePins: useLocalActionPins,
  SearchBar: LocalSearchBar,
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
