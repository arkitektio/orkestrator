import { Guard } from "@/app/Arkitekt";
import { useModifierState } from "@/app/hooks/modifierTracker";
import { talkTargetFromModifiers } from "@/providers/smart/extensions/alpaka/useTalkAbout";
import { CommandActionRow } from "@/providers/smart/extensions/CommandActionRow";
import { smartRegistry } from "@/providers/smart/registry";
import { Box } from "lucide-react";
import { useState } from "react";

import { useCommandPalette } from "../../CommandPaletteProvider";
import { useOpenTarget } from "../../useOpenTarget";
import { TalkAboutHit } from "./TalkAboutHit";

/**
 * One found thing.
 *
 * Primary action navigates. The secondary one — hold ⇧ — makes the result the
 * palette's CONTEXT instead, so the Rekuest actions and Kabinet definitions
 * further up the list immediately light up for it. That is the genuinely
 * powerful move and it costs almost nothing: `SmartModifier` and
 * `ModifierRender` already exist and already know how to render an object as
 * context.
 *
 * The third — the "Talk" chip, or ⌥+Enter — opens an Alpaka room about the
 * hit with what was typed as the opening message. Typing a question and
 * pressing ⌥⏎ on the thing it is about is the whole gesture. Alpaka-guarded
 * from the outside, so a deployment without it simply has no chip. Where the
 * room lands is the same choice the context menu spells out as rows: ⌥⇧⏎ puts
 * it beside this page, ⌥⌘⏎ in a window of its own.
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
  const { activateModifier, query } = useCommandPalette();
  // The app already tracks modifier state globally (one listener set, shared);
  // reading it here beats trying to recover the originating event, which cmdk's
  // `onSelect` does not hand us.
  const modifiers = useModifierState();
  const { shiftKey, altKey } = modifiers;
  const [talkRequested, setTalkRequested] = useState(0);

  return (
    <CommandActionRow
      title={label}
      description={description ?? smartRegistry.getDisplayName(identifier)}
      icon={Box}
      onSelect={() => {
        // Alt asks about the result; the chip does the actual opening.
        if (altKey) {
          setTalkRequested((n) => n + 1);
          return;
        }

        // Shift turns the result into context rather than a destination.
        if (shiftKey) {
          activateModifier({ type: "smart", identifier, id, label });
          return;
        }

        // Navigates, and also pins when the palette was opened with ⌘T.
        openTarget({ kind: "entity", identifier, id, label });
        onDone?.();
      }}
      trailing={
        <Guard.Alpaka unavailable={<></>} unconfigured={<></>} configuring={<></>} challenging={<></>}>
          <TalkAboutHit
            identifier={identifier}
            id={id}
            label={label}
            prompt={query}
            requested={talkRequested}
            target={talkTargetFromModifiers(modifiers)}
            onDone={onDone}
          />
        </Guard.Alpaka>
      }
    />
  );
};

export default EntityRow;
