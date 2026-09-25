import { smartSections } from "../hostRegistries";
import { Button } from "@/core/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/core/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/core/ui/popover";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import { cn } from "@/core/util/utils";
import { ArrowRight, PlayIcon } from "lucide-react";
import React from "react";
import { describeStructures } from "./describe";
import { useSmartPrefetcher } from "./prefetchContext";
import { SmartMenuWrappers } from "./SmartMenuWrappers";
import type { SmartSectionContext } from "./section";
import { SectionHost } from "./SectionHost";
import { resolveSections, SmartSectionRegistry } from "./sectionRegistry";
import { SectionsProgress } from "./SectionsProgress";
import { createSectionStatusStore, isEmptyResult } from "./sectionStatus";
import { SectionStatusProvider, useSectionSummary } from "./sectionStatusContext";
import type { ObjectButtonProps, SmartContextProps } from "./types";
import { useAfterFirstPaint } from "./useAfterFirstPaint";
import { useFirstItemSelection } from "./useFirstItemSelection";

export const ObjectButton = (props: ObjectButtonProps) => {
  const prefetcher = useSmartPrefetcher();
  return (
    <Popover>
      <PopoverTrigger
        // The child is the button: a trigger of its own would nest one.
        asChild
        onPointerEnter={() =>
          prefetcher?.prefetch({
            objects: props.objects,
            partners: props.partners,
            collection: props.collection,
          })
        }
      >
        {props.children || (
          <Button
            variant={props.variant || "outline"}
            className={cn(props.className, "text-foreground")}
            size={props.size || "icon"}
          >
            <PlayIcon />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="text-foreground border-border px-2 py-2 items-left"
        data-nonbreaker
      >
        <SmartContext {...props} />
      </PopoverContent>
    </Popover>
  );
};

/**
 * What the menu is about, when that is not plain from where it opened: a
 * drop ("2 Images → Dataset", as the gesture went) or a selection ("3 Images").
 * One object, right-clicked, needs no telling.
 */
const SmartContextHeader = ({ objects, partners }: SmartContextProps) => {
  const dropped = partners && partners.length > 0;
  if (!dropped && objects.length < 2) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5 px-2 pb-2 pt-1 text-xs font-medium text-foreground">
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

/**
 * The smart context menu: every registered section that applies to the
 * selection, in priority order.
 *
 * It unrolls in two tiers. The instant sections (local actions) are on screen
 * in the frame the menu opens; the remote ones mount one frame later and
 * appear, each in its fixed slot, as their data lands — nothing above them
 * moves. A slim bar under the search runs until every section has answered,
 * and only then may the menu say there is nothing to do.
 */
export const SmartContext = ({
  registry = smartSections(),
  ...props
}: SmartContextProps & { registry?: SmartSectionRegistry }) => {
  const { objects, partners, returns, collection, sections, onDone, onError } = props;
  const [filter, setFilterValue] = React.useState<string | undefined>(undefined);
  // The raw value narrows the rows on screen at once; the queries run on the
  // debounced copy, so typing does not cost a request per key.
  const debouncedFilter = useDebounce(filter, 200);
  const [store] = React.useState(createSectionStatusStore);

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
      filter: debouncedFilter,
      liveFilter: filter,
    }),
    [objects, partners, returns, collection, sections, onDone, onError, debouncedFilter, filter],
  );

  return (
    <SectionStatusProvider store={store}>
      <SmartMenuWrappers context={props} returnFocusTo={selection.inputRef}>
        <div ref={selection.rootRef} className="contents">
          <SmartContextHeader {...props} />

          <Command
            shouldFilter={false}
            value={selection.value}
            onValueChange={selection.setValue}
            onKeyDown={selection.onKeyDown}
          >
            <CommandInput
              ref={selection.inputRef}
              placeholder="Search"
              className="h-10 text-sm"
              onValueChange={(value) => {
                setFilterValue(value);
                selection.repin();
              }}
              autoFocus
            />
            <SectionsProgress active={summary.pending} />

            <CommandList className="mt-2" onPointerMove={selection.onPointerMove}>
              {plan.map((section) =>
                section.tier === "instant" || painted ? (
                  <SectionHost key={section.id} section={section} context={context} />
                ) : null,
              )}
              {isEmptyResult(summary) ? (
                <CommandEmpty>No Action available</CommandEmpty>
              ) : null}
            </CommandList>
          </Command>
        </div>
      </SmartMenuWrappers>
    </SectionStatusProvider>
  );
};
