import { Guard } from "@/app/Arkitekt";
import { titleFromPrompt } from "@/alpaka/recentRooms";
import { useModifierState } from "@/app/hooks/modifierTracker";
import {
  talkTargetFromModifiers,
  useTalkAbout,
} from "@/alpaka/smart/useTalkAbout";
import { CommandActionRow } from "@/providers/smart/extensions/CommandActionRow";
import type { PassDownProps } from "@/providers/smart/extensions/types";
import { CommandGroup } from "cmdk";
import { MessageSquareMore } from "lucide-react";

import { useCommandPalette } from "../CommandPaletteProvider";

/** cmdk keys rows by `value`; fixed, so the row keeps its place as you type. */
const ASK_VALUE = "ask-an-agent";

const AskRow = ({
  question,
  objects,
  onDone,
  onError,
}: { question: string } & Pick<PassDownProps, "objects" | "onDone" | "onError">) => {
  const { openRoom, isOpening, error } = useTalkAbout({
    title: () => titleFromPrompt(question),
    onDone: () => onDone?.({ kind: "local" }),
    onError,
  });
  // Same choice the context menu spells out as rows, and the same gesture the
  // Talk chip takes: ⇧ opens the chat beside this page, ⌘/ctrl in a window of
  // its own. Read globally — cmdk's `onSelect` hands us no event.
  const modifiers = useModifierState();
  const target = talkTargetFromModifiers(modifiers);
  const where =
    target === "side" ? " to the side" : target === "window" ? " in a new window" : "";

  return (
    <CommandGroup
      heading={
        <span className="ml-2 inline-flex w-full items-center gap-2 text-xs font-light">
          Ask
        </span>
      }
    >
      <CommandActionRow
        value={ASK_VALUE}
        onSelect={() => void openRoom(objects, question, target)}
        title={`Ask an agent${where}`}
        description={
          objects.length === 0
            ? `Open a chat${where} with “${question}”`
            : objects.length === 1
              ? `Open a chat${where} about this with “${question}”`
              : `Open a chat${where} about these ${objects.length} with “${question}”`
        }
        icon={MessageSquareMore}
        disabled={isOpening}
        trailing={
          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            {isOpening ? <span>Opening…</span> : null}
            {error ? <span className="text-destructive">{error}</span> : null}
          </span>
        }
      />
    </CommandGroup>
  );
};

/**
 * "Ask an agent" — there for whatever is typed, matching or not.
 *
 * The palette's other sources answer a query by finding something; this one
 * answers it by asking. So "whats that?" — which matches no page, action or
 * entity — still leaves one row to press Enter on: it opens an Alpaka room with
 * the question in the composer and whatever is in context attached to it.
 *
 * Reads the RAW query, not the debounced `filter` the searching sources get:
 * nothing is fetched here, and the row must carry the last keystroke even when
 * Enter follows it inside the debounce window.
 *
 * Alpaka GraphQL, so the row mounts under `Guard.Alpaka` — from outside, before
 * its mutation hook can run.
 */
export const ApplicableAsk = ({ filter, objects, onDone, onError }: PassDownProps) => {
  const { query } = useCommandPalette();
  const question = (query || filter || "").trim();

  if (!question) {
    return null;
  }

  return (
    <Guard.Alpaka>
      <AskRow question={question} objects={objects} onDone={onDone} onError={onError} />
    </Guard.Alpaka>
  );
};
