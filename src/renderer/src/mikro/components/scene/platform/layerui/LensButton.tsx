import { PlayIcon } from "lucide-react";

import { Button } from "@/core/ui/button";
import { lensSmart } from "@/core/linkers";

type Lens = { __typename?: string; id: string };

/**
 * The play button of a layer's LENS: the smart menu of what the layer reads,
 * so an action launched from a layer card is handed the selection on screen
 * (this dataset, these channels, this window of the table), not the layer.
 *
 * The click is kept inside: the menu is portalled, but React bubbles its
 * events through the tree, and a row that toggles on click would fold every
 * time a menu item was picked.
 */
export const LensButton = ({ lens, className }: { lens: Lens | null | undefined; className: string }) => {
  if (!lens) return null;
  const LensSmart = lensSmart(lens.__typename as Parameters<typeof lensSmart>[0]);
  return (
    <span className="contents" onClick={(event) => event.stopPropagation()}>
      <LensSmart.ObjectButton object={{ id: lens.id }}>
        <Button variant="ghost" size="xs" className={className} title="Run on this layer's lens">
          <PlayIcon className="h-3 w-3" />
        </Button>
      </LensSmart.ObjectButton>
    </span>
  );
};
