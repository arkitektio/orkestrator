import { AsyncCombobox } from "@/core/forms/AsyncCombobox";
import { SearchFunction } from "@/core/forms/SearchField";
import {
  ActionLabel,
  PageActionPolicy,
  useActionSlotSize,
} from "@/core/ui/page-action";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/core/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
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
}: PageActionPolicy & {
  structure: string | null;
  direction: DemandDirection;
  onChange: (next: {
    structure?: string | null;
    direction?: DemandDirection;
  }) => void;
}) => {
  // Page chrome: in a narrow action row this keeps the glyph and drops the
  // words. The policy props are read off the element by the row itself.
  const size = useActionSlotSize();
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
        <Button variant="outline" size={size} className="gap-2" aria-label="Works on">
          <Shapes className="h-4 w-4" />
          <ActionLabel>
            Works on
            {structure && (
              <Badge variant="secondary" className="max-w-40 truncate">
                {direction === "produces" ? "→ " : ""}
                {structure}
              </Badge>
            )}
          </ActionLabel>
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
