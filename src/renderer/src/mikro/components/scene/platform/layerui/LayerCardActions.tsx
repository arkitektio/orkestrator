import { Eye, EyeOff, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The show/hide and remove buttons every layer card puts in
 * `LayerCardShell`'s `actions` slot.
 *
 * The slot existed from the start; seven cards filled it with the same two
 * buttons, the same sizes and the same hover colours, and any restyling had to
 * be made seven times to stay consistent.
 *
 * `onRemove` is optional because a card may be shown where removal is not
 * offered — the button is omitted entirely rather than disabled, so there is
 * nothing to click and nothing to explain.
 */
export const LayerCardActions = ({
  hidden,
  onToggleVisible,
  onRemove,
}: {
  hidden: boolean;
  onToggleVisible: () => void;
  onRemove?: () => void;
}) => (
  <>
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
