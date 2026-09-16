import { useModifierState } from "@/app/hooks/modifierTracker";
import { CommandActionRow } from "@/providers/smart/extensions/CommandActionRow";
import { smartRegistry } from "@/providers/smart/registry";
import { Box } from "lucide-react";

import { useCommandPalette } from "../../CommandPaletteProvider";
import { useOpenTarget } from "../../useOpenTarget";

/**
 * One found thing.
 *
 * Primary action navigates. The secondary one — hold ⇧ — makes the result the
 * palette's CONTEXT instead, so the Rekuest actions and Kabinet definitions
 * further up the list immediately light up for it. That is the genuinely
 * powerful move and it costs almost nothing: `SmartModifier` and
 * `ModifierRender` already exist and already know how to render an object as
 * context.
 */
export const EntityRow = ({
  identifier,
  id,
  label,
  description,
  onDone,
}: {
  identifier: string;
  id: string;
  label: string;
  description?: string;
  onDone?: () => void;
}) => {
  const openTarget = useOpenTarget();
  const { activateModifier } = useCommandPalette();
  // The app already tracks modifier state globally (one listener set, shared);
  // reading it here beats trying to recover the originating event, which cmdk's
  // `onSelect` does not hand us.
  const { shiftKey } = useModifierState();

  return (
    <CommandActionRow
      title={label}
      description={description ?? smartRegistry.getDisplayName(identifier)}
      icon={Box}
      onSelect={() => {

        // Shift turns the result into context rather than a destination.
        if (shiftKey) {
          activateModifier({ type: "smart", identifier, id, label });
          return;
        }

        // Navigates, and also pins when the palette was opened with ⌘T.
        openTarget({ kind: "entity", identifier, id, label });
        onDone?.();
      }}
    />
  );
};

export default EntityRow;
