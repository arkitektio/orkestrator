import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { cn } from "@/core/util/utils";
import { SmartRowItem, type SkinGroupProps, type SkinRowProps, type SmartMenuSkin } from "../skin";
import { CommandActionIcon, FLASH_CLASS, RowPinToggle } from "./parts";

/**
 * Actions as a grid of tiles: an icon over a short title, the description
 * and a failure in the tooltip, the progress as a bar along the tile's foot.
 * No headings — every section flows into the one grid, pinned tiles first.
 * For a view with little room and few actions, where a row's description
 * would be the first thing cut (the scene's annotation card).
 *
 * A row's `trailing` and `className` are the list's and are not drawn here;
 * its `buttons` and pin sit small in the tile's corner.
 */

const TileRow = (props: SkinRowProps) => {
  const { pin } = props;
  return (
    <SmartRowItem
      value={props.value}
      onSelect={props.onSelect}
      onContextMenu={props.onContextMenu}
      disabled={props.disabled}
      data-unavailable={props.unavailable ? "true" : undefined}
      className={cn(
        "relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-md border border-border/50 bg-muted/20 p-1.5 text-foreground",
        // The menu keeps its first item selected for Enter; in a card whose
        // search is folded nothing types Enter, so the mark waits for focus.
        "hover:bg-muted/60 group-focus-within/smart-menu:data-[selected=true]:border-border group-focus-within/smart-menu:data-[selected=true]:bg-muted",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        props.running && "animate-pulse",
        props.unavailable && "opacity-50",
        props.failure && "ring-1 ring-inset ring-destructive/40",
        props.flash && FLASH_CLASS,
      )}
    >
      <Tooltip>
        <TooltipTrigger className="flex w-full min-w-0 cursor-pointer flex-col items-center gap-1 text-center">
          <CommandActionIcon icon={props.icon} svg={props.svg} leading={props.leading} className="h-7 w-7" />
          <span className="line-clamp-2 w-full break-words text-[10px] leading-tight">
            {props.title}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">
          <span className="block font-medium">{props.title}</span>
          {props.description ? <span className="block">{props.description}</span> : null}
          {props.unavailable && !props.failure ? (
            <span className="mt-1 block text-muted-foreground">{props.unavailable.reason}</span>
          ) : null}
          {props.failure ? (
            <span className="mt-1 block text-destructive">
              {props.failure.title}
              {props.failure.detail ? `: ${props.failure.detail}` : null}
            </span>
          ) : null}
        </TooltipContent>
      </Tooltip>
      {props.progress ? (
        <span
          aria-hidden
          className="absolute bottom-0 left-0 h-0.5 bg-emerald-500 transition-[width]"
          style={{ width: `${props.progress}%` }}
        />
      ) : null}
      {props.buttons || pin ? (
        <span className="absolute right-0.5 top-0.5 flex items-center [&>button]:h-5 [&>button]:w-5">
          {props.buttons}
          {pin ? <RowPinToggle pin={pin} title={props.title} /> : null}
        </span>
      ) : null}
    </SmartRowItem>
  );
};

const TileGroup = ({ children }: SkinGroupProps) => <>{children}</>;

export const TILE_SKIN: SmartMenuSkin = {
  Row: TileRow,
  Group: TileGroup,
  // cmdk draws its items inside the list's sizer: the grid goes there. What
  // is not a tile (the empty line, a section's error) spans the row.
  listClassName:
    "[&_[cmdk-list-sizer]]:grid [&_[cmdk-list-sizer]]:grid-cols-3 [&_[cmdk-list-sizer]]:gap-1.5 [&_[cmdk-empty]]:col-span-full [&_[data-slot=section-error]]:col-span-full",
  pinnedClassName: "contents",
};
