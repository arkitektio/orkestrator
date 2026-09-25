import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { datasetStoredBytes, formatBytes } from "../../specs";

type SizedLevel = {
  id: string;
  level: number;
  shape: readonly number[];
  store: { sizeBytes?: unknown };
};

/**
 * What an array dataset holds on disk, with the sum broken down per pyramid
 * level in a tooltip — the total is only ever the composition of its levels.
 * Renders nothing while any level is unmeasured, like `datasetStoredBytes`.
 */
export const DatasetStoredSize = (props: {
  dataArrays: readonly SizedLevel[];
  axisNames?: readonly string[];
  className?: string;
}) => {
  const total = datasetStoredBytes(props.dataArrays);
  if (total === undefined) return null;

  // `level` is a field, not a position — the API does not promise order.
  const levels = [...props.dataArrays].sort((a, b) => a.level - b.level);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("cursor-default tabular-nums", props.className)}>
          {formatBytes(total)}
        </span>
      </TooltipTrigger>
      {/* Popover tokens, not the base tooltip's inverted foreground box: this
          is a small table, and it should read like the app's other floating
          surfaces in either theme. The arrow's colours are fixed in
          TooltipContent, so they are overridden through the descendant. */}
      <TooltipContent
        side="bottom"
        className="max-w-sm bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 [&_svg]:bg-popover [&_svg]:fill-popover"
      >
        <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-0.5 tabular-nums">
          {levels.map((array) => (
            <div key={array.id} className="contents">
              <span className="text-muted-foreground">L{array.level}</span>
              <span className="truncate">
                {array.shape
                  .map((extent, index) => `${extent}${props.axisNames?.[index] ?? ""}`)
                  .join(" × ")}
              </span>
              <span className="text-right">
                {formatBytes(Number(array.store.sizeBytes))}
              </span>
            </div>
          ))}
          {levels.length > 1 && (
            <>
              <span className="col-span-2 border-t border-border pt-0.5 text-muted-foreground">
                {levels.length} levels
              </span>
              <span className="border-t border-border pt-0.5 text-right font-medium">
                {formatBytes(total)}
              </span>
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
