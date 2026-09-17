import { useCreateRoomMutation } from "@/alpaka/api/graphql";
import { AlpakaRoom } from "@/linkers";
import React from "react";
import { useNavigate } from "react-router-dom";

import { titleFromPrompt } from "../../../../alpaka/recentRooms";
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

  const openRoom = React.useCallback(
    async (structures: readonly TalkableStructure[], prompt?: string) => {
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
        navigate(`${AlpakaRoom.linkBuilder(roomId)}?${params.join("&")}`);
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
