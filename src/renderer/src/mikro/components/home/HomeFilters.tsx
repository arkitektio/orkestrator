import { useSelf } from "@/core/connection/useSelf";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Button } from "@/core/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/core/ui/command";
import { DateTimeRangePicker } from "@/core/ui/date-time-range-picker";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { Input } from "@/core/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import {
  parseAsArrayOf,
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "@/core/util/hooks/use-search-param-state";
import { cn } from "@/core/util/utils";
import { useDebounce } from "@uidotdev/usehooks";
import { Check, ChevronDown, Handshake, Search, Shapes, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ArrayDatasetSpec, RootFilter, useHomeFilterOptionsQuery } from "../../api/graphql";
import { ADATASET_SPEC_BY_SLUG, ADATASET_SPECS } from "../../specs";

const SPEC_SLUGS = ADATASET_SPECS.map((entry) => entry.slug) as [string, ...string[]];

/** Which time a date range is read against. */
export const TIME_AXES = ["acquired", "created"] as const;
export type TimeAxis = (typeof TIME_AXES)[number];

export type HomeFilterState = {
  /** Text the name holds. */
  search: string;
  /** The creator's sub. */
  user: string | null;
  collaboration: string | null;
  axis: TimeAxis;
  from: Date | null;
  to: Date | null;
  /** Every one of these, as `ArrayDatasetFilter.spec` reads them. */
  specs: ArrayDatasetSpec[];
};

/**
 * The filter row as `roots`' `RootFilter`. A field is omitted, never sent as
 * null, when it does not narrow, so an untouched row asks exactly what the
 * unfiltered page asked. The range goes to the acquisition or the creation
 * fields, never both.
 */
export const homeRootFilter = ({ search, user, collaboration, axis, from, to, specs }: HomeFilterState): RootFilter => {
  const text = search.trim();
  const after = from?.toISOString();
  const before = to?.toISOString();
  return {
    ...(text ? { search: text } : {}),
    ...(user ? { owner: user } : {}),
    ...(collaboration ? { collaboration } : {}),
    ...(specs.length ? { spec: specs } : {}),
    ...(axis === "acquired"
      ? { ...(after ? { acquiredAfter: after } : {}), ...(before ? { acquiredBefore: before } : {}) }
      : { ...(after ? { createdAfter: after } : {}), ...(before ? { createdBefore: before } : {}) }),
  };
};

/**
 * The home page's filters, kept in the URL so a filtered home is a link. Only
 * what was changed is written: an untouched home has a clean URL.
 */
export const useHomeFilters = () => {
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  // Debounced so a keystroke does not refetch; the field shows what was typed at once.
  const debouncedSearch = useDebounce(search.trim(), 400);
  const [user, setUser] = useQueryState("user", parseAsString);
  const [collaboration, setCollaboration] = useQueryState("collab", parseAsString);
  const [axis, setAxis] = useQueryState("axis", parseAsStringLiteral(TIME_AXES).withDefault("acquired"));
  const [from, setFrom] = useQueryState("from", parseAsIsoDateTime);
  const [to, setTo] = useQueryState("to", parseAsIsoDateTime);
  const [specSlugs, setSpecSlugs] = useQueryState(
    "spec",
    parseAsArrayOf(parseAsStringLiteral(SPEC_SLUGS)).withDefault([]),
  );

  // Unknown slugs (a hand-edited URL) drop out rather than reaching the server.
  const specKey = specSlugs.join(",");
  const specs = useMemo(
    () => specSlugs.flatMap((slug) => ADATASET_SPEC_BY_SLUG[slug]?.spec ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [specKey],
  );

  const state: HomeFilterState = { search, user, collaboration, axis, from, to, specs };
  const fromKey = from?.getTime();
  const toKey = to?.getTime();
  const filters = useMemo(
    () => homeRootFilter({ search: debouncedSearch, user, collaboration, axis, from, to, specs }),
    // The dates are compared by time: the URL parser hands out a fresh Date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedSearch, user, collaboration, axis, fromKey, toKey, specs],
  );

  return {
    state,
    filters,
    // The typed text counts at once, so Clear shows while the search is still settling.
    active: Object.keys(filters).length > 0 || search.trim().length > 0,
    setSearch: (next: string) => setSearch(next || null),
    setUser,
    setCollaboration,
    specSlugs,
    setSpecSlugs: (next: string[]) => setSpecSlugs(next.length ? next : null),
    setAxis: (next: TimeAxis) => setAxis(next === "acquired" ? null : next),
    setRange: (next: { from?: Date; to?: Date }) => {
      setFrom(next.from ?? null);
      setTo(next.to ?? null);
    },
    clear: () => {
      setSearch(null);
      setUser(null);
      setCollaboration(null);
      setAxis(null);
      setFrom(null);
      setTo(null);
      setSpecSlugs(null);
    },
  };
};

export type HomeFilters = ReturnType<typeof useHomeFilters>;

/** A filter's trigger: quiet while it does not narrow, tinted with the brand once it does. */
const Trigger = ({
  active,
  icon: Icon,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { active: boolean; icon: typeof Users }) => (
  <Button
    variant="outline"
    size="sm"
    className={cn(
      "h-8 gap-1.5 rounded-full font-normal",
      active ? "border-primary/40 bg-primary/10 text-foreground hover:bg-primary/15" : "text-muted-foreground",
    )}
    {...props}
  >
    <Icon className="h-3.5 w-3.5" />
    {children}
    <ChevronDown className="h-3 w-3 opacity-60" />
  </Button>
);

/** What it is called: a pill-shaped field matching the triggers beside it. */
const SearchField = ({ value, onChange }: { value: string; onChange: (next: string) => void }) => (
  <div className="relative">
    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => event.key === "Escape" && onChange("")}
      placeholder="Search by name…"
      aria-label="Search by name"
      className={cn(
        "h-8 w-56 rounded-full pl-8 pr-7 text-sm",
        value && "border-primary/40 bg-primary/10",
      )}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange("")}
        aria-label="Clear search"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

/** Who made it: the organization's members, "Me" first. */
const PeopleFilter = ({
  value,
  onChange,
  members,
}: {
  value: string | null;
  onChange: (sub: string | null) => void;
  members: string[];
}) => {
  const [open, setOpen] = useState(false);
  const { userId } = useSelf();
  const others = members.filter((sub) => sub !== userId);
  const pick = (sub: string | null) => {
    onChange(sub);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Trigger active={!!value} icon={Users} aria-label="Created by">
          {value ? (
            value === userId ? (
              "Me"
            ) : (
              <StructureDisplay identifier="@lok/user" id={value} variant="chip" small fallback={value} />
            )
          ) : (
            "Anyone"
          )}
        </Trigger>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search people…" />
          <CommandList>
            <CommandEmpty>No one matches.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="anyone" onSelect={() => pick(null)}>
                Anyone
                {!value && <Check className="ml-auto h-4 w-4" />}
              </CommandItem>
              {userId && (
                <CommandItem value="me" onSelect={() => pick(userId)}>
                  Me
                  {value === userId && <Check className="ml-auto h-4 w-4" />}
                </CommandItem>
              )}
            </CommandGroup>
            {others.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Members">
                  {others.map((sub) => (
                    <CommandItem key={sub} value={sub} onSelect={() => pick(sub)}>
                      <StructureDisplay identifier="@lok/user" id={sub} variant="chip" fallback={sub} />
                      {value === sub && <Check className="ml-auto h-4 w-4" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

/** Which collaboration it was put in. */
const CollaborationFilter = ({
  value,
  onChange,
  collaborations,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  collaborations: { id: string; name: string }[];
}) => {
  const [open, setOpen] = useState(false);
  const picked = collaborations.find((collaboration) => collaboration.id === value);
  const pick = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Trigger active={!!value} icon={Handshake} aria-label="Collaboration">
          <span className="max-w-40 truncate">{value ? (picked?.name ?? "Collaboration") : "Any collaboration"}</span>
        </Trigger>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search collaborations…" />
          <CommandList>
            <CommandEmpty>No collaboration matches.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="any collaboration" onSelect={() => pick(null)}>
                Any collaboration
                {!value && <Check className="ml-auto h-4 w-4" />}
              </CommandItem>
              {collaborations.map((collaboration) => (
                <CommandItem
                  key={collaboration.id}
                  value={`${collaboration.name} ${collaboration.id}`}
                  onSelect={() => pick(collaboration.id)}
                >
                  <span className="truncate">{collaboration.name}</span>
                  {value === collaboration.id && <Check className="ml-auto h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

/**
 * What kind of image: the spec catalog the array-dataset list offers. A
 * dataset has one spatial spec, so ticking a second replaces the first
 * (together they would match nothing); the acquisition modifiers stack.
 */
const SpecFilter = ({ value, onChange }: { value: string[]; onChange: (slugs: string[]) => void }) => {
  const picked = ADATASET_SPECS.filter((entry) => value.includes(entry.slug));
  const spatial = ADATASET_SPECS.filter((entry) => entry.kind === "spatial");
  const modifiers = ADATASET_SPECS.filter((entry) => entry.kind === "modifier");
  const spatialSlugs = new Set(spatial.map((entry) => entry.slug));

  const toggle = (slug: string, checked: boolean) => {
    if (!checked) return onChange(value.filter((entry) => entry !== slug));
    const rest = spatialSlugs.has(slug) ? value.filter((entry) => !spatialSlugs.has(entry)) : value;
    onChange([...rest, slug]);
  };
  const item = (entry: (typeof ADATASET_SPECS)[number]) => (
    <DropdownMenuCheckboxItem
      key={entry.slug}
      checked={value.includes(entry.slug)}
      onCheckedChange={(checked) => toggle(entry.slug, checked)}
      onSelect={(event) => event.preventDefault()}
    >
      <entry.icon className="h-3.5 w-3.5 text-muted-foreground" />
      {entry.label}
    </DropdownMenuCheckboxItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Trigger active={picked.length > 0} icon={Shapes} aria-label="Spec">
          <span className="max-w-48 truncate">
            {picked.length ? picked.map((entry) => entry.label).join(" · ") : "Any spec"}
          </span>
        </Trigger>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>Spatial (pick one)</DropdownMenuLabel>
        {spatial.map(item)}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Acquisition</DropdownMenuLabel>
        {modifiers.map(item)}
        {picked.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>
              <X className="h-3.5 w-3.5" />
              Any spec
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * The home page's filter row: what it is called, who made it, which collaboration holds it,
 * what kind of image it is, and when — acquired (what the microscope recorded) or created (when it came in).
 * One quiet line over the grid; a filter that narrows is tinted.
 */
export const HomeFilterBar = ({ filters }: { filters: HomeFilters }) => {
  const { state, active, setSearch, setUser, setCollaboration, specSlugs, setSpecSlugs, setAxis, setRange, clear } = filters;
  const { data } = useHomeFilterOptionsQuery({ fetchPolicy: "cache-first" });
  // The range picker keeps its own range; remount it when the range is reset
  // from outside (Clear), so it does not keep showing the old one.
  const [pickerKey, setPickerKey] = useState(0);
  const members = useMemo(
    () => [...new Set((data?.members ?? []).map((member) => member.user.sub))],
    [data?.members],
  );
  const hasRange = !!(state.from || state.to);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={state.search} onChange={setSearch} />
        <PeopleFilter value={state.user} onChange={setUser} members={members} />
        <CollaborationFilter
          value={state.collaboration}
          onChange={setCollaboration}
          collaborations={data?.collaborations ?? []}
        />
        <SpecFilter value={specSlugs} onChange={setSpecSlugs} />
        <div className="flex items-center gap-1.5">
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={state.axis}
            onValueChange={(next) => next && setAxis(next as TimeAxis)}
            aria-label="Date is"
          >
            <ToggleGroupItem value="acquired" className="h-8 px-2.5 text-xs">
              Acquired
            </ToggleGroupItem>
            <ToggleGroupItem value="created" className="h-8 px-2.5 text-xs">
              Created
            </ToggleGroupItem>
          </ToggleGroup>
          <DateTimeRangePicker
            key={pickerKey}
            align="start"
            initialDateFrom={state.from ?? undefined}
            initialDateTo={state.to ?? undefined}
            onUpdate={({ range }) => setRange({ from: range.from, to: range.to })}
          />
        </div>
        {active && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground"
            onClick={() => {
              clear();
              setPickerKey((key) => key + 1);
            }}
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>
      {((state.axis === "acquired" && hasRange) || state.specs.length > 0) && (
        <p className="px-0.5 text-xs text-muted-foreground">
          {state.specs.length > 0
            ? "Only images and the files they came from are listed: a file shows when one of its images matches."
            : "Only images and the files they came from have an acquisition time."}
        </p>
      )}
    </div>
  );
};
