import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/core/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { useLayerCardHeaderActions } from "./layerCardSlot";
import { HEADER_BUTTON } from "./headerButton";
import { LensButton } from "./LensButton";

/** What the host put in the title bar (`LayerCardHeaderActionsContext`). */
const HeaderActions = () => <>{useLayerCardHeaderActions()}</>;

export { HEADER_BUTTON };

/** The lens button's look in a compact card header, for the cards that fill
 *  `actions` themselves. */
export const LENS_BUTTON = HEADER_BUTTON;

/**
 * The remove button every layer card carries — one component, because the
 * removal ASKS first: a trash icon a few pixels from the eye toggle deleted the
 * layer row on a slip. The click opens a small confirm beside the button;
 * only "Remove" there calls `onRemove`.
 *
 * Clicks inside the popover stop propagating: it is portalled, but React still
 * bubbles its events through the card header, which would otherwise fold the
 * card (or select the row) on every button press.
 */
export const RemoveLayerButton = ({
  onRemove,
  className = HEADER_BUTTON,
}: {
  onRemove: () => void;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`${className} hover:text-red-700 dark:hover:text-red-300`}
          title="Remove layer from scene"
          onClick={(event) => event.stopPropagation()}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex w-56 flex-col gap-2 p-2.5"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium">Remove this layer?</span>
          <span className="text-[11px] leading-snug text-muted-foreground">
            It leaves the scene; the data it shows is kept.
          </span>
        </div>
        <div className="flex justify-end gap-1.5">
          <Button size="xs" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="xs"
            variant="destructive"
            autoFocus
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
          >
            Remove
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/**
 * The show/hide and remove buttons every layer card puts in
 * `LayerCardShell`'s `actions` slot.
 *
 * The slot existed from the start; seven cards filled it with the same two
 * buttons, the same sizes and the same hover colours, and any restyling had to
 * be made seven times to stay consistent.
 *
 * `lens` leads with the play button of what the layer reads (`LensButton`).
 *
 * `onRemove` is optional because a card may be shown where removal is not
 * offered — the button is omitted entirely rather than disabled, so there is
 * nothing to click and nothing to explain.
 */
export const LayerCardActions = ({
  lens,
  hidden,
  onToggleVisible,
  onRemove,
}: {
  lens?: { __typename?: string; id: string } | null;
  hidden: boolean;
  onToggleVisible: () => void;
  onRemove?: () => void;
}) => (
  <>
    <HeaderActions />
    <LensButton lens={lens} className={LENS_BUTTON} />
    <Button
      variant="ghost"
      size="icon"
      className={HEADER_BUTTON}
      title={hidden ? "Show" : "Hide"}
      onClick={onToggleVisible}
    >
      {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
    </Button>
    {onRemove && <RemoveLayerButton onRemove={onRemove} />}
  </>
);
