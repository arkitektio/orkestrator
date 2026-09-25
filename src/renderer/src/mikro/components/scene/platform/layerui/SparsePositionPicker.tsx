/**
 * Choosing WHICH slice of a matrix a colouring reads.
 *
 * The picker offers one row per matrix, never one per gene — a 19,059-feature
 * transcriptome would otherwise be 19,059 rows in a dropdown, and the server
 * says so itself on `ColorByOption.axes`. So picking the matrix and picking the
 * position are two steps, and this is the second one.
 *
 * A position is a ROW INDEX, not a name. The names live in the table the axis
 * references, which is exactly what `SparseAxisReference` is for; `readAxisPositions`
 * reads that table once and everything after is browser-side filtering. So
 * scrubbing through genes costs no round trip at all: the list is already here,
 * the picker state is local until Save, and the slice itself is two chunk reads.
 *
 * One control per identified axis, because `at` must name every one of them —
 * a rank-two matrix has one, a rank-three one (cell x metabolite x adduct) has
 * two, and an `at` naming a different set is refused server-side.
 */
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/core/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { useSparseColouringSourceQuery } from "@/mikro/api/graphql";
import { useAttributeServiceOrNull } from "@/mikro/lib/attributes/AttributeServiceProvider";
import { matchPositions, readAxisPositions, type AxisPosition } from "@/mikro/lib/sparse/axisPositions";

type At = readonly { axis: string; value: number }[];

/** One axis' control: the current position, and a searchable list of the rest. */
const AxisPositionSelect = ({
  axis,
  value,
  positions,
  loading,
  error,
  onPick,
}: {
  axis: string;
  value: number;
  positions: readonly AxisPosition[];
  loading: boolean;
  error: string | null;
  onPick: (position: number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const shown = useMemo(() => matchPositions(positions, search), [positions, search]);
  const current = useMemo(
    () => positions.find((entry) => entry.value === value),
    [positions, value],
  );

  return (
    <div className="space-y-1">
      <div className="text-[9px] uppercase tracking-[0.08em] text-white/35">{axis}</div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full truncate rounded border border-white/10 bg-black/20 px-2 py-1 text-left text-xs hover:border-white/20"
            title={`Which ${axis} this colouring reads`}
          >
            {/* The index is shown beside the name because it is what is STORED —
                a name that has drifted from the table would otherwise be
                invisible. */}
            {current ? current.label : `position ${value}`}
            <span className="ml-1 text-[9px] text-muted-foreground">#{value}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder={`Search ${axis}…`}
              className="text-xs"
            />
            <CommandList>
              {loading && <div className="px-3 py-2 text-[10px] text-white/40">Reading {axis}…</div>}
              {error && <div className="px-3 py-2 text-[10px] text-amber-300/80">{error}</div>}
              {!loading && !error && shown.length === 0 && (
                <CommandEmpty className="px-3 py-2 text-[10px]">No {axis} matches.</CommandEmpty>
              )}
              <CommandGroup>
                {shown.map((entry) => (
                  <CommandItem
                    key={entry.value}
                    value={String(entry.value)}
                    onSelect={() => {
                      onPick(entry.value);
                      setOpen(false);
                    }}
                    className="gap-2 text-xs"
                  >
                    <span className="flex-1 truncate">{entry.label}</span>
                    <span className="shrink-0 text-[9px] text-muted-foreground">#{entry.value}</span>
                    {entry.value === value && <Check className="h-3 w-3 shrink-0" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export const SparsePositionPicker = ({
  dataset,
  at,
  onCommit,
}: {
  /** The matrix the entry names. */
  dataset: string;
  at: At;
  onCommit: (at: At) => void;
}) => {
  const service = useAttributeServiceOrNull();
  const source = useSparseColouringSourceQuery({ variables: { id: dataset } });
  const [positions, setPositions] = useState<Record<string, readonly AxisPosition[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const references = source.data?.sparseDataset.axisReferences;

  useEffect(() => {
    if (!service || !references) return;
    let cancelled = false;
    for (const reference of references) {
      // Cached per referenced table for the app's life, so this is a no-op on
      // every entry after the first over one dataset.
      void readAxisPositions(service.engine, reference.references)
        .then((read) => {
          if (cancelled) return;
          setPositions((previous) => ({ ...previous, [reference.axis]: read }));
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setErrors((previous) => ({
            ...previous,
            [reference.axis]: error instanceof Error ? error.message : String(error),
          }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [service, references]);

  if (source.loading) return <div className="text-[10px] text-white/40">Resolving the matrix…</div>;
  if (!source.data) {
    return <div className="text-[10px] text-amber-300/80">Could not resolve matrix {dataset}.</div>;
  }

  return (
    <div className="space-y-1.5">
      {at.map((position) => (
        <AxisPositionSelect
          key={position.axis}
          axis={position.axis}
          value={position.value}
          positions={positions[position.axis] ?? []}
          loading={!positions[position.axis] && !errors[position.axis]}
          error={errors[position.axis] ?? null}
          onPick={(value) =>
            // Replace only this axis. `at` must keep naming every identified
            // axis — dropping one is refused server-side.
            onCommit(at.map((entry) => (entry.axis === position.axis ? { ...entry, value } : entry)))
          }
        />
      ))}
    </div>
  );
};
