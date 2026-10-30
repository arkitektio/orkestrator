import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import {
  ActionLabel,
  PageActionPolicy,
  useActionSlotSize,
} from "@/core/ui/page-action";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import {
  parseAsBoolean,
  useQueryState,
} from "@/core/util/hooks/use-search-param-state";
import { Filter } from "lucide-react";
import { useCallback, useMemo } from "react";
import {
  Capability,
  CapabilityFacets,
  countCapabilityFacets,
  DYNAMIC_CAPABILITIES,
  DynamicCapability,
  NO_CAPABILITY_FACETS,
} from "../../lib/capabilities";
import { FacetRow } from "./FacetRow";

const ANY = "any";

const ROWS: { key: Capability; label: string; yes: string; hint: string }[] = [
  {
    key: "asks",
    label: "Asks you",
    yes: "Asks",
    hint: "Its tasks may stop and wait until a person answers.",
  },
  {
    key: "informs",
    label: "Informs you",
    yes: "Informs",
    hint: "Its tasks may show a person something while they go on.",
  },
  {
    key: "calls",
    label: "Calls other actions",
    yes: "Calls",
    hint: "Its tasks may run actions of other apps.",
  },
];

const DYNAMIC_LABELS: Record<DynamicCapability, string> = {
  dynamicAsks: "Asks",
  dynamicInforms: "Informs",
  dynamicCalls: "Calls",
};

/**
 * The capability facets as URL state, under the filter fields' own names.
 * The facets object only changes when one of them does.
 */
export const useCapabilityFacets = (): [
  CapabilityFacets,
  (next: Partial<CapabilityFacets>) => void,
] => {
  const [asks, setAsks] = useQueryState("asks", parseAsBoolean);
  const [informs, setInforms] = useQueryState("informs", parseAsBoolean);
  const [calls, setCalls] = useQueryState("calls", parseAsBoolean);
  const [dynamicAsks, setDynamicAsks] = useQueryState("dynamicAsks", parseAsBoolean);
  const [dynamicInforms, setDynamicInforms] = useQueryState("dynamicInforms", parseAsBoolean);
  const [dynamicCalls, setDynamicCalls] = useQueryState("dynamicCalls", parseAsBoolean);

  const facets = useMemo(
    () => ({ asks, informs, calls, dynamicAsks, dynamicInforms, dynamicCalls }),
    [asks, informs, calls, dynamicAsks, dynamicInforms, dynamicCalls],
  );
  const setFacets = useCallback(
    (next: Partial<CapabilityFacets>) => {
      if ("asks" in next) setAsks(next.asks ?? null);
      if ("informs" in next) setInforms(next.informs ?? null);
      if ("calls" in next) setCalls(next.calls ?? null);
      if ("dynamicAsks" in next) setDynamicAsks(next.dynamicAsks ?? null);
      if ("dynamicInforms" in next) setDynamicInforms(next.dynamicInforms ?? null);
      if ("dynamicCalls" in next) setDynamicCalls(next.dynamicCalls ?? null);
    },
    [setAsks, setInforms, setCalls, setDynamicAsks, setDynamicInforms, setDynamicCalls],
  );
  return [facets, setFacets];
};

/**
 * Whether it asks you, informs you or calls other actions: Any, yes, or
 * never. "Never" is the useful one: what runs without needing anybody. The
 * last row narrows to what decides at run time, beyond what it declared.
 */
export const CapabilityFacetRows = ({
  facets,
  onChange,
}: {
  facets: CapabilityFacets;
  onChange: (next: Partial<CapabilityFacets>) => void;
}) => (
  <>
    {ROWS.map((row) => (
      <FacetRow key={row.key} label={row.label} hint={row.hint}>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="justify-start"
          value={facets[row.key] === null ? ANY : String(facets[row.key])}
          onValueChange={(v) =>
            onChange({ [row.key]: !v || v === ANY ? null : v === "true" })
          }
        >
          <ToggleGroupItem value={ANY}>Any</ToggleGroupItem>
          <ToggleGroupItem value="true">{row.yes}</ToggleGroupItem>
          <ToggleGroupItem value="false">Never</ToggleGroupItem>
        </ToggleGroup>
      </FacetRow>
    ))}

    <FacetRow
      label="Decides at run time"
      hint="Beyond what it declared: bloks made while it runs, or actions it finds."
    >
      <ToggleGroup
        type="multiple"
        variant="outline"
        size="sm"
        className="justify-start"
        value={DYNAMIC_CAPABILITIES.filter((key) => facets[key] === true)}
        onValueChange={(values) =>
          onChange(
            Object.fromEntries(
              DYNAMIC_CAPABILITIES.map((key) => [
                key,
                values.includes(key) ? true : null,
              ]),
            ),
          )
        }
      >
        {DYNAMIC_CAPABILITIES.map((key) => (
          <ToggleGroupItem key={key} value={key}>
            {DYNAMIC_LABELS[key]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FacetRow>
  </>
);

/** The capability facets alone in a popover, for a list with no other facets. */
export const CapabilityFilter = ({
  facets,
  onChange,
}: PageActionPolicy & {
  facets: CapabilityFacets;
  onChange: (next: Partial<CapabilityFacets>) => void;
}) => {
  const size = useActionSlotSize();
  const active = countCapabilityFacets(facets);

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
      <PopoverContent align="end" className="flex w-80 flex-col gap-4">
        <CapabilityFacetRows facets={facets} onChange={onChange} />
        {active > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => onChange(NO_CAPABILITY_FACETS)}
          >
            Clear filters
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};
