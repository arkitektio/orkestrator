import { useCreateRoomMutation } from "@/alpaka/api/graphql";
import { AlpakaRoom } from "@/linkers";
import React from "react";
import { useNavigate } from "react-router-dom";

import {
  storeRoomTalkingAbout,
  toStructureInputs,
} from "../../../../alpaka/roomTalkingAbout";

export type TalkableStructure = {
  identifier: string;
  object: { id: string | number };
};

/**
 * Open an Alpaka room about some structures, with a first message ready.
 *
 * The one implementation behind every "talk about" surface: the context
 * action on a selection, and the chip on a search hit. Creates the room,
 * remembers what it is about, and lands in it with the structures attached and
 * `prompt` (what the user typed) prefilled — or a generic opener if nothing
 * was typed.
 *
 * Alpaka GraphQL: the caller must sit under `Guard.Alpaka`.
 */
export const useTalkAbout = (options: {
  title?: (structures: readonly TalkableStructure[]) => string;
  onDone?: () => void;
  onError?: (message: string) => void;
} = {}) => {
  const [createRoom] = useCreateRoomMutation();
  const navigate = useNavigate();
  const [isOpening, setIsOpening] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { title, onDone, onError } = options;

  const openRoom = React.useCallback(
    async (structures: readonly TalkableStructure[], prompt?: string) => {
      const talkingAbout = toStructureInputs(structures);
      if (talkingAbout.length === 0) {
        setError("No structure selected");
        onError?.("No structure selected");
        return;
      }

      setIsOpening(true);
      setError(null);
      try {
        const roomTitle =
          title?.(structures) ??
          (structures.length === 1
            ? `Talk about ${structures[0].identifier}`
            : `Talk about ${structures.length} structures`);
        const result = await createRoom({
          variables: {
            input: {
              title: roomTitle,
              description:
                structures.length === 1
                  ? `Conversation about ${structures[0].identifier} ${structures[0].object.id}`
                  : `Conversation about ${structures.length} selected structures`,
              talkingAbout,
            },
          },
        });
        const roomId = result.data?.createRoom.id;
        if (!roomId) throw new Error("Failed to create room");

        storeRoomTalkingAbout(roomId, talkingAbout);
        onDone?.();

        const promptText =
          prompt?.trim() ||
          `Please tell me more about this ${talkingAbout.length === 1 ? "structure" : "structures"}.`;
        navigate(
          `${AlpakaRoom.linkBuilder(roomId)}?prefillStructures=${encodeURIComponent(
            JSON.stringify(talkingAbout),
          )}&text=${encodeURIComponent(promptText)}`,
        );
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "Failed to create room";
        setError(message);
        onError?.(message);
      } finally {
        setIsOpening(false);
      }
    },
    [createRoom, navigate, title, onDone, onError],
  );

  return { openRoom, isOpening, error };
};
