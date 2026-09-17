import { AsyncCombobox } from "@/components/fields/AsyncCombobox";
import { SearchFunction } from "@/components/fields/SearchField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useListStructuresLazyQuery } from "@/rekuest/api/graphql";
import { DemandDirection } from "@/rekuest/lib/actionBrowse";
import { Shapes } from "lucide-react";
import { useCallback } from "react";

/**
 * "Works on…" — narrows the catalog to actions that take (or return) a given
 * structure, e.g. everything that accepts an image. The structures offered are
 * rekuest's own: the ones some action port in this org actually references.
 */
export const StructureDemandFilter = ({
  structure,
  direction,
  onChange,
}: {
  structure: string | null;
  direction: DemandDirection;
  onChange: (next: {
    structure?: string | null;
    direction?: DemandDirection;
  }) => void;
}) => {
  const [searchStructures] = useListStructuresLazyQuery();

  const search = useCallback<SearchFunction>(
    async ({ search }) => {
      const { data } = await searchStructures({
        variables: { search: search || undefined },
      });
      return (data?.structures ?? []).map((s) => ({
        value: s.identifier,
        label: s.identifier,
      }));
    },
    [searchStructures],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Shapes className="h-4 w-4" />
          Works on
          {structure && (
            <Badge variant="secondary" className="max-w-40 truncate">
              {direction === "produces" ? "→ " : ""}
              {structure}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-72 flex-col gap-3">
        <div className="text-xs text-muted-foreground">
          Show actions that take or return a kind of data.
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="justify-start"
          value={direction}
          onValueChange={(v) => v && onChange({ direction: v as DemandDirection })}
        >
          <ToggleGroupItem value="consumes">Takes</ToggleGroupItem>
          <ToggleGroupItem value="produces">Returns</ToggleGroupItem>
        </ToggleGroup>
        <AsyncCombobox
          value={structure}
          onChange={(v) => onChange({ structure: v ?? null })}
          search={search}
          placeholder="Any structure"
          commandPlaceholder="Search structures…"
          emptyPlaceholder="No structure found."
        />
        {structure && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => onChange({ structure: null })}
          >
            Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};
