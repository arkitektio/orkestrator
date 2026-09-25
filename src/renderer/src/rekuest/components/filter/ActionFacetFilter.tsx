import { AsyncCombobox } from "@/components/fields/AsyncCombobox";
import { SearchFunction } from "@/components/fields/SearchField";
import {
  ActionLabel,
  PageActionPolicy,
  useActionSlotSize,
} from "@/components/ui/page-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAppsQuery } from "@/lok/api/graphql";
import { ActionKind, useProtocolOptionsLazyQuery } from "@/rekuest/api/graphql";
import { Filter, X } from "lucide-react";
import { useCallback } from "react";

export type ActionFacets = {
  kind: ActionKind | null;
  stateful: boolean | null;
  app: string | null;
  protocol: string | null;
  collection: string | null;
};

const ANY = "any";

const FacetRow = (props: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <div className="text-xs font-medium text-muted-foreground">{props.label}</div>
    {props.children}
  </div>
);

/**
 * Every server-side action facet in one popover. A popover rather than Home's
 * dropdown menu because protocols and apps need a search box. The number of
 * active facets is echoed on the trigger so the reader always knows why the
 * catalog looks the way it does.
 */
export const ActionFacetFilter = ({
  facets,
  onChange,
}: PageActionPolicy & {
  facets: ActionFacets;
  onChange: (next: Partial<ActionFacets>) => void;
}) => {
  // Page chrome: in a narrow action row this keeps the glyph and the count
  // and drops the word. The policy props are read off the element by the row.
  const size = useActionSlotSize();
  const { data: apps } = useAppsQuery();
  // Two instances: one lazy query cannot serve two concurrent calls.
  const [searchProtocols] = useProtocolOptionsLazyQuery();
  const [lookupProtocol] = useProtocolOptionsLazyQuery();

  const searchApps = useCallback<SearchFunction>(
    async ({ search }) => {
      const term = search?.trim().toLowerCase() ?? "";
      return (apps?.apps ?? [])
        .filter((a) => a.identifier.toLowerCase().includes(term))
        .map((a) => ({ value: a.identifier, label: a.identifier }));
    },
    [apps],
  );

  // The facet holds a protocol id. The combobox only searches by text, so the
  // selected protocol is looked up alongside — otherwise it would read as a
  // bare id whenever it is not among the first page of options.
  const selectedProtocol = facets.protocol;
  const searchProtocolOptions = useCallback<SearchFunction>(
    async ({ search }) => {
      const [found, selected] = await Promise.all([
        searchProtocols({ variables: { search: search || undefined } }),
        selectedProtocol
          ? lookupProtocol({ variables: { values: [selectedProtocol] } })
          : undefined,
      ]);
      const options = [...(found.data?.options ?? [])];
      for (const option of selected?.data?.options ?? []) {
        if (!options.some((o) => o.value === option.value)) options.push(option);
      }
      return options;
    },
    [searchProtocols, lookupProtocol, selectedProtocol],
  );

  const active = [
    facets.kind,
    facets.stateful !== null ? true : null,
    facets.app,
    facets.protocol,
    facets.collection,
  ].filter(Boolean).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size={size} className="gap-2" aria-label="Filter">
          <Filter className="h-4 w-4" />
          <ActionLabel>
            Filter
            {active > 0 && <Badge variant="secondary">{active}</Badge>}
          </ActionLabel>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-72 flex-col gap-4">
        <FacetRow label="Kind">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            className="justify-start"
            value={facets.kind ?? ANY}
            onValueChange={(v) =>
              onChange({ kind: !v || v === ANY ? null : (v as ActionKind) })
            }
          >
            <ToggleGroupItem value={ANY}>Any</ToggleGroupItem>
            <ToggleGroupItem value={ActionKind.Function}>Function</ToggleGroupItem>
            <ToggleGroupItem value={ActionKind.Generator}>Generator</ToggleGroupItem>
          </ToggleGroup>
        </FacetRow>

        <FacetRow label="Stateful">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            className="justify-start"
            value={facets.stateful === null ? ANY : String(facets.stateful)}
            onValueChange={(v) =>
              onChange({ stateful: !v || v === ANY ? null : v === "true" })
            }
          >
            <ToggleGroupItem value={ANY}>Any</ToggleGroupItem>
            <ToggleGroupItem value="true">Stateful</ToggleGroupItem>
            <ToggleGroupItem value="false">Stateless</ToggleGroupItem>
          </ToggleGroup>
        </FacetRow>

        <FacetRow label="App">
          <AsyncCombobox
            value={facets.app}
            onChange={(v) => onChange({ app: v ?? null })}
            search={searchApps}
            placeholder="Any app"
            commandPlaceholder="Search apps…"
          />
        </FacetRow>

        <FacetRow label="Protocol">
          <AsyncCombobox
            value={facets.protocol}
            onChange={(v) => onChange({ protocol: v ?? null })}
            search={searchProtocolOptions}
            placeholder="Any protocol"
            commandPlaceholder="Search protocols…"
          />
        </FacetRow>

        {/* Collections have no root query to pick from; the facet is only ever
            set by following a collection chip, so it is shown to be cleared. */}
        {facets.collection && (
          <FacetRow label="Collection">
            <Badge variant="secondary" className="w-fit gap-1">
              {facets.collection}
              <button
                type="button"
                aria-label="Clear collection filter"
                onClick={() => onChange({ collection: null })}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </FacetRow>
        )}

        {active > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() =>
              onChange({
                kind: null,
                stateful: null,
                app: null,
                protocol: null,
                collection: null,
              })
            }
          >
            Clear filters
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};
