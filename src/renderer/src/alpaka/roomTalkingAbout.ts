import type { StructureInput } from "./api/graphql";

/**
 * Alpaka references foreign objects by a numeric id, while the app-level
 * `Structure` carries `id` as a string. Everything that hands a
 * structure to alpaka goes through {@link toStructureInput} so the coercion
 * (and the "not a number" case) lives in one place.
 */
export type RoomTalkingAboutStructure = StructureInput;

export const toStructureInput = (structure: {
  identifier: string;
  id?: string | number | null;
}): StructureInput | null => {
  const rawObject = structure.id;

  if (rawObject == null || rawObject === "") {
    return null;
  }

  const object = Number(rawObject);

  return Number.isInteger(object)
    ? { identifier: structure.identifier, object }
    : null;
};

export const toStructureInputs = (
  structures: readonly {
    identifier: string;
    id?: string | number | null;
  }[],
): StructureInput[] =>
  structures
    .map(toStructureInput)
    .filter((structure): structure is StructureInput => structure !== null);

/**
 * What the first message of a chat should carry.
 *
 * A chat started *about* something ("Talk about", or "New chat" in a model's
 * chat tab) attaches that something to its opening message, so the replyer
 * knows what is being asked about. Only the opening message: once the room has
 * messages the structure is already in the conversation.
 *
 * `about` is what the surface knows the chat is about (the sidebar's own
 * structure); without it, what the room was opened about (`Room.talkingAbout`,
 * stored on the server, so it is the same on every device).
 */
export const firstMessageAttachments = (
  room: { messages: readonly unknown[]; talkingAbout: readonly RoomTalkingAboutStructure[] },
  about?: readonly RoomTalkingAboutStructure[],
): RoomTalkingAboutStructure[] => {
  if (room.messages.length > 0) {
    return [];
  }

  return about && about.length > 0 ? [...about] : roomTalkingAbout(room);
};

/** What the room was opened about, as structure inputs (a message attachment). */
export const roomTalkingAbout = (room: {
  talkingAbout: readonly RoomTalkingAboutStructure[];
}): RoomTalkingAboutStructure[] =>
  room.talkingAbout.map(({ identifier, object }) => ({ identifier, object }));
