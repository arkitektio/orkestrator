import type { OperationHandler } from "@/lib/module-host/operations";
import type { JSONObject } from "@/types";
import {
  CreateRoomDocument,
  type CreateRoomMutation,
  type CreateRoomMutationVariables,
  SendMessageDocument,
  type SendMessageMutation,
  type SendMessageMutationVariables,
} from "./api/graphql";
import { storeRoomTalkingAbout, toStructureInputs } from "./roomTalkingAbout";

const aboutOf = (value: unknown): { identifier: string; id: string }[] =>
  Array.isArray(value)
    ? value.flatMap((entry) =>
        entry && typeof entry === "object" && "identifier" in entry && "id" in entry
          ? [{ identifier: String(entry.identifier), id: String(entry.id) }]
          : [],
      )
    : [];

/**
 * `alpaka.startRoom`: a room about some structures, with a first message.
 * Args `{ title, description?, text, about: { identifier, id }[] }`; answers
 * `{ roomId, messageId }` so the caller can hand the message to an agent.
 */
const startRoom: OperationHandler = {
  service: "alpaka",
  run: async (client, args: JSONObject) => {
    const about = aboutOf(args.about);
    const talkingAbout = toStructureInputs(about);
    if (about.length > 0 && talkingAbout.length === 0) {
      throw new Error("None of the selected structures can be attached");
    }

    const room = await client.mutate<CreateRoomMutation, CreateRoomMutationVariables>({
      mutation: CreateRoomDocument,
      variables: {
        input: {
          title: String(args.title ?? "Room"),
          description: typeof args.description === "string" ? args.description : undefined,
          talkingAbout,
        },
      },
    });
    const roomId = room.data?.createRoom.id;
    if (!roomId) throw new Error("Failed to create room");
    if (talkingAbout.length > 0) storeRoomTalkingAbout(roomId, talkingAbout);

    const message = await client.mutate<SendMessageMutation, SendMessageMutationVariables>({
      mutation: SendMessageDocument,
      variables: {
        input: {
          text: String(args.text ?? ""),
          room: roomId,
          agentId: "default",
          attachStructures: talkingAbout,
        },
      },
    });
    const messageId = message.data?.send.id;
    if (!messageId) throw new Error("Failed to send message to room");

    return { roomId, messageId };
  },
};

export const ALPAKA_OPERATIONS: Record<string, OperationHandler> = {
  "alpaka.startRoom": startRoom,
};
