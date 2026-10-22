import { Eye, EyeOff, Trash2 } from "lucide-react";

import { Button } from "@/core/ui/button";
import { LensButton } from "./LensButton";

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
/** The lens button's look in a compact card header, for the cards that fill
 *  `actions` themselves. */
export const LENS_BUTTON = "h-5 w-5 shrink-0 p-0 text-white/45 hover:text-white/90";

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
    <LensButton lens={lens} className={LENS_BUTTON} />
    <Button
      variant="ghost"
      size="icon"
      className="h-5 w-5 shrink-0 text-white/45 hover:text-white/90"
      title={hidden ? "Show" : "Hide"}
      onClick={onToggleVisible}
    >
      {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
    </Button>
    {onRemove && (
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0 text-white/35 hover:text-red-300"
        title="Remove layer from scene"
        onClick={onRemove}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    )}
  </>
);
