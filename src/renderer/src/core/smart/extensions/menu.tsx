import { ArrowRight } from "lucide-react";
import React from "react";

import { Command, CommandEmpty, CommandInput, CommandList } from "@/core/ui/command";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import { cn } from "@/core/util/utils";
import { smartSections } from "../hostRegistries";
import { describeStructures } from "./describe";
import { CompactRowsProvider, PinnedSlotProvider } from "./rowPin";
import type { SmartContextSection, SmartSectionContext } from "./section";
import { SectionHost, SectionSearchBar } from "./SectionHost";
import { resolveSections, type SmartSectionRegistry } from "./sectionRegistry";
import { SectionsProgress } from "./SectionsProgress";
import { createSectionStatusStore, isEmptyResult, type SectionStatusStore } from "./sectionStatus";
import { SectionStatusProvider, useSectionSummary } from "./sectionStatusContext";
import { SmartMenuSkinProvider, useSmartMenuSkinOverride, type SmartMenuSkin } from "./skin";
import { LIST_SKIN } from "./skins/list";
import { SmartMenuWrappers } from "./SmartMenuWrappers";
import type { SmartContextProps } from "./types";
import { useAfterFirstPaint } from "./useAfterFirstPaint";
import { useFirstItemSelection } from "./useFirstItemSelection";

/**
 * The smart menu, in parts. `useSmartMenu` owns everything the menu knows —
 * which sections apply, the search text (raw and debounced), what every
 * section reported, the first-item selection, the two tiers — and the parts
 * draw it. `SmartContext` is one composition of them (the right-click menu,
 * `ObjectButton`, drops); a view with a look of its own composes the parts it
 * wants, where it wants them, and passes a skin (`skin.tsx`) for the rows:
 *
 *   const menu = useSmartMenu(props);
 *   <SmartMenu.Root menu={menu} skin={TILE_SKIN}>
 *     <SmartMenu.Body>
 *       <SmartMenu.Search />
 *       <SmartMenu.Progress />
 *       <SmartMenu.List>
 *         <SmartMenu.Pinned />
 *         <SmartMenu.Sections />
 *         <SmartMenu.Empty />
 *       </SmartMenu.List>
 *     </SmartMenu.Body>
 *   </SmartMenu.Root>
 *
 * Everything a row needs (Enter, the arrow keys, Run on…) lives inside
 * `Body` — cmdk's `Command` — so the search and the list go in there; the
 * header and a view's own chrome may sit outside.
 */

export type SmartMenuState = {
  props: SmartContextProps;
  sections: SmartContextSection<any>[];
  /** What every section is handed: the props plus the search text. */
  context: SmartSectionContext;
  /** The raw search text; `context.filter` is its debounced copy. */
  filter: string | undefined;
  setFilter: (filter: string | undefined) => void;
  store: SectionStatusStore;
  summary: ReturnType<typeof useSectionSummary>;
  selection: ReturnType<typeof useFirstItemSelection>;
  /** The remote sections mount one frame after the instant ones. */
  painted: boolean;
  pinnedSlot: HTMLDivElement | null;
  setPinnedSlot: (slot: HTMLDivElement | null) => void;
};

export const useSmartMenu = ({
  registry = smartSections(),
  ...props
}: SmartContextProps & { registry?: SmartSectionRegistry }): SmartMenuState => {
  const { objects, partners, returns, collection, sections, onDone, onError, materialize } = props;
  const [filter, setFilter] = React.useState<string | undefined>(undefined);
  // The raw value narrows the rows on screen at once; the queries run on the
  // debounced copy, so typing does not cost a request per key.
  const debouncedFilter = useDebounce(filter, 200);
  const [store] = React.useState(createSectionStatusStore);
  // Where the sections lift their pinned rows to (`SectionHost`).
  const [pinnedSlot, setPinnedSlot] = React.useState<HTMLDivElement | null>(null);

  const plan = React.useMemo(
    () => resolveSections(registry, { objects, partners, returns, collection, sections }),
    [registry, objects, partners, returns, collection, sections],
  );
  const expectedIds = React.useMemo(() => plan.map((section) => section.id), [plan]);
  const painted = useAfterFirstPaint();
  const summary = useSectionSummary(store, expectedIds);
  const selection = useFirstItemSelection([
    summary.revision,
    summary.total,
    debouncedFilter,
    painted,
  ]);

  const context = React.useMemo<SmartSectionContext>(
    () => ({
      objects,
      partners,
      returns,
      collection,
      sections,
      onDone,
      onError,
      materialize,
      filter: debouncedFilter,
      liveFilter: filter,
      hasSearchBar: true,
    }),
    [objects, partners, returns, collection, sections, onDone, onError, materialize, debouncedFilter, filter],
  );

  return {
    props,
    sections: plan,
    context,
    filter,
    setFilter,
    store,
    summary,
    selection,
    painted,
    pinnedSlot,
    setPinnedSlot,
  };
};

const SmartMenuContext = React.createContext<SmartMenuState | null>(null);

/** The menu a part is in — for a view's own parts (a search toggle, a count). */
export const useSmartMenuState = (): SmartMenuState => {
  const menu = React.useContext(SmartMenuContext);
  if (!menu) throw new Error("A SmartMenu part must be inside <SmartMenu.Root>");
  return menu;
};

const useSkin = () => useSmartMenuSkinOverride() ?? LIST_SKIN;

/** The providers: the menu's state, its skin, the status store, the modules' menu wrappers. */
const Root = ({
  menu,
  skin,
  children,
}: {
  menu: SmartMenuState;
  /** How rows and groups look; default the list. */
  skin?: SmartMenuSkin;
  children: React.ReactNode;
}) => (
  <SmartMenuContext.Provider value={menu}>
    <SmartMenuSkinProvider value={skin ?? null}>
      <SectionStatusProvider store={menu.store}>
        <SmartMenuWrappers context={menu.props} returnFocusTo={menu.selection.inputRef}>
          <div ref={menu.selection.rootRef} className="contents">
            {children}
          </div>
        </SmartMenuWrappers>
      </SectionStatusProvider>
    </SmartMenuSkinProvider>
  </SmartMenuContext.Provider>
);

/** cmdk's `Command`: the search and the list go inside, so keys reach the rows. */
const Body = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  const { selection } = useSmartMenuState();
  return (
    <Command
      shouldFilter={false}
      value={selection.value}
      onValueChange={selection.setValue}
      onKeyDown={selection.onKeyDown}
      // Named, so a skin can show the selection only while the menu has focus.
      className={cn("group/smart-menu", className)}
    >
      {children}
    </Command>
  );
};

/**
 * What the menu is about, when that is not plain from where it opened: a
 * drop ("2 Images → Dataset", as the gesture went) or a selection ("3 Images").
 * One object, right-clicked, needs no telling.
 */
const Header = ({ className }: { className?: string }) => {
  const { objects, partners } = useSmartMenuState().props;
  const dropped = partners && partners.length > 0;
  if (!dropped && objects.length < 2) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1.5 px-2 pb-2 pt-1 text-xs font-medium text-foreground",
        className,
      )}
    >
      {dropped && (
        <>
          <span className="truncate">{describeStructures(partners)}</span>
          <ArrowRight aria-hidden className="h-3 w-3 shrink-0 text-muted-foreground" />
        </>
      )}
      <span className="truncate">{describeStructures(objects)}</span>
    </div>
  );
};

/** The search field, ending in the sections' `SearchBar` buttons. */
const Search = ({
  placeholder = "Search",
  className = "h-10 text-sm",
  autoFocus,
}: {
  placeholder?: string;
  className?: string;
  /** Default: the menu's `autoFocus` prop, which defaults to true. */
  autoFocus?: boolean;
}) => {
  const menu = useSmartMenuState();
  const { sections, context, selection } = menu;
  return (
    <CommandInput
      ref={selection.inputRef}
      placeholder={placeholder}
      className={className}
      value={menu.filter ?? ""}
      onValueChange={(value) => {
        menu.setFilter(value);
        selection.repin();
      }}
      autoFocus={autoFocus ?? menu.props.autoFocus ?? true}
      trailing={
        sections.some((section) => section.SearchBar)
          ? sections.map((section) => (
              <SectionSearchBar key={section.id} section={section} context={context} />
            ))
          : undefined
      }
    />
  );
};

/** A slim sweep while any section has yet to answer. */
const Progress = () => <SectionsProgress active={useSmartMenuState().summary.pending} />;

/** The scrolling list; the rows are drawn tight unless `compact` is false. */
const List = ({
  className = "mt-2",
  compact = true,
  children,
}: {
  className?: string;
  compact?: boolean;
  children: React.ReactNode;
}) => {
  const { selection, pinnedSlot } = useSmartMenuState();
  const skin = useSkin();
  return (
    <CommandList className={cn(className, skin.listClassName)} onPointerMove={selection.onPointerMove}>
      <CompactRowsProvider value={compact}>
        <PinnedSlotProvider value={pinnedSlot}>{children}</PinnedSlotProvider>
      </CompactRowsProvider>
    </CommandList>
  );
};

/** Where pinned rows are lifted to. No heading: what is first is what was pinned. */
const Pinned = () => {
  const { setPinnedSlot } = useSmartMenuState();
  const skin = useSkin();
  return (
    <div
      ref={setPinnedSlot}
      role="group"
      aria-label="Pinned actions"
      className={skin.pinnedClassName}
    />
  );
};

/** Every section that applies, in priority order: the instant ones now, the remote ones a frame later. */
const Sections = () => {
  const { sections, context, painted } = useSmartMenuState();
  return (
    <>
      {sections.map((section) =>
        section.tier === "instant" || painted ? (
          <SectionHost key={section.id} section={section} context={context} />
        ) : null,
      )}
    </>
  );
};

/** Said only once every section has answered and none had anything. */
const Empty = ({ children = "No Action available" }: { children?: React.ReactNode }) => {
  const { summary } = useSmartMenuState();
  return isEmptyResult(summary) ? <CommandEmpty>{children}</CommandEmpty> : null;
};

export const SmartMenu = { Root, Body, Header, Search, Progress, List, Pinned, Sections, Empty };
