import { useCreateRoomMutation } from "@/alpaka/api/graphql";
import { useTabActions } from "@/command/tabs/TabsProvider";
import { AlpakaRoom } from "@/linkers";
import React from "react";
import { useNavigate } from "react-router-dom";

import { titleFromPrompt } from "../recentRooms";
import {
  storeRoomTalkingAbout,
  toStructureInputs,
} from "../roomTalkingAbout";

export type TalkableStructure = {
  identifier: string;
  object: { id: string | number };
};

/**
 * Where the new room lands.
 *
 * `here` navigates the current tab, `side` opens it beside this page in a
 * split (the room on the right, what you were looking at still on the left),
 * `window` pops it out into a window of its own — the same three targets the
 * generic Open / Open to the side / Open in new window actions offer, so a
 * conversation about a structure can sit next to the structure.
 */
export type TalkTarget = "here" | "side" | "window";

/**
 * Whether this build can pop a room out. Electron only: the web build has no
 * preload bridge, and the rows that offer it hide rather than fail.
 */
export const canTalkInNewWindow = () =>
  typeof window.api?.openSecondWindow === "function";

/**
 * Which target the held modifiers ask for: ⇧ beside this page, ⌘/ctrl in a
 * window of its own, nothing plain.
 *
 * The palette's surfaces (the "Ask an agent" row, the Talk chip on a hit)
 * offer the three targets this way rather than as three rows — a list you
 * press Enter on stays one row per thing, and the modifiers are already how
 * that list teaches its secondary moves (⇧ for context, ⌥ for talk).
 */
export const talkTargetFromModifiers = (modifiers: {
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
}): TalkTarget => {
  if (modifiers.metaKey || modifiers.ctrlKey) return canTalkInNewWindow() ? "window" : "side";
  if (modifiers.shiftKey) return "side";
  return "here";
};

/**
 * Open an Alpaka room about some structures, with a first message ready.
 *
 * The one implementation behind every "talk about" surface: the context
 * action on a selection, the chip on a search hit, and the palette's "Ask an
 * agent". Creates the room, remembers what it is about, and lands in it with
 * the structures attached and `prompt` (what the user typed) prefilled — or a
 * generic opener if nothing was typed.
 *
 * A question needs no subject: with a `prompt` and no structures this opens a
 * plain chat holding that question. With neither there is nothing to open.
 *
 * Alpaka GraphQL: the caller must sit under `Guard.Alpaka`.
 */
export const useTalkAbout = (options: {
  title?: (structures: readonly TalkableStructure[]) => string;
  onDone?: () => void;
  onError?: (message: string) => void;
} = {}) => {
  const [createRoom] = useCreateRoomMutation({
    refetchQueries: ["RecentRooms", "Rooms"],
  });
  const navigate = useNavigate();
  const [isOpening, setIsOpening] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { title, onDone, onError } = options;

  const { openBeside } = useTabActions();

  const openRoom = React.useCallback(
    async (
      structures: readonly TalkableStructure[],
      prompt?: string,
      target: TalkTarget = "here",
    ) => {
      const talkingAbout = toStructureInputs(structures);
      const question = prompt?.trim();
      if (talkingAbout.length === 0 && !question) {
        setError("No structure selected");
        onError?.("No structure selected");
        return;
      }

      setIsOpening(true);
      setError(null);
      try {
        const about = talkingAbout.length > 0;
        const roomTitle =
          title?.(structures) ??
          (!about && question
            ? titleFromPrompt(question)
            : structures.length === 1
              ? `Talk about ${structures[0].identifier}`
              : `Talk about ${structures.length} structures`);
        const result = await createRoom({
          variables: {
            input: {
              title: roomTitle,
              description: !about
                ? undefined
                : structures.length === 1
                  ? `Conversation about ${structures[0].identifier} ${structures[0].object.id}`
                  : `Conversation about ${structures.length} selected structures`,
              talkingAbout: about ? talkingAbout : undefined,
            },
          },
        });
        const roomId = result.data?.createRoom.id;
        if (!roomId) throw new Error("Failed to create room");

        storeRoomTalkingAbout(roomId, talkingAbout);
        onDone?.();

        const promptText =
          question ||
          `Please tell me more about this ${talkingAbout.length === 1 ? "structure" : "structures"}.`;
        const params = [
          about && `prefillStructures=${encodeURIComponent(JSON.stringify(talkingAbout))}`,
          `text=${encodeURIComponent(promptText)}`,
        ].filter(Boolean);
        const to = `${AlpakaRoom.linkBuilder(roomId)}?${params.join("&")}`;
        // `window` falls back to this tab when there is no preload bridge —
        // the room is created either way, so it must land somewhere.
        if (target === "window" && canTalkInNewWindow()) {
          window.api.openSecondWindow(to);
        } else if (target === "side") {
          openBeside(to, { label: roomTitle, evict: true });
        } else {
          navigate(to);
        }
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "Failed to create room";
        setError(message);
        onError?.(message);
      } finally {
        setIsOpening(false);
      }
    },
    [createRoom, navigate, openBeside, title, onDone, onError],
  );

  return { openRoom, isOpening, error };
};
