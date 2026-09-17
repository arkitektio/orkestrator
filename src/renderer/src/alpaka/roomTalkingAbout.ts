import type { StructureInput } from "./api/graphql";

/**
 * Alpaka references foreign objects by a numeric id, while the app-level
 * `Structure` carries `object.id` as a string. Everything that hands a
 * structure to alpaka goes through {@link toStructureInput} so the coercion
 * (and the "not a number" case) lives in one place.
 */
export type RoomTalkingAboutStructure = StructureInput;

export const toStructureInput = (structure: {
  identifier: string;
  object?: { id?: string | number | null } | null;
}): StructureInput | null => {
  const rawObject = structure.object?.id;

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
    object?: { id?: string | number | null } | null;
  }[],
): StructureInput[] =>
  structures
    .map(toStructureInput)
    .filter((structure): structure is StructureInput => structure !== null);

const ROOM_TALKING_ABOUT_STORAGE_KEY = "alpaka-room-talking-about";

const readStoredRoomTalkingAbout = (): Record<string, RoomTalkingAboutStructure[]> => {
  if (typeof window === "undefined") {
    return {};
  }

  const rawValue = window.localStorage.getItem(ROOM_TALKING_ABOUT_STORAGE_KEY);

  if (!rawValue) {
    return {};
  }

  try {
    return JSON.parse(rawValue) as Record<string, RoomTalkingAboutStructure[]>;
  } catch {
    return {};
  }
};

const writeStoredRoomTalkingAbout = (
  value: Record<string, RoomTalkingAboutStructure[]>,
) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ROOM_TALKING_ABOUT_STORAGE_KEY,
    JSON.stringify(value),
  );
};

export const storeRoomTalkingAbout = (
  roomId: string,
  structures: RoomTalkingAboutStructure[],
) => {
  const nextStructures = structures.filter(
    (structure) => structure.identifier && structure.object != null,
  );

  if (nextStructures.length === 0) {
    return;
  }

  const currentValue = readStoredRoomTalkingAbout();

  writeStoredRoomTalkingAbout({
    ...currentValue,
    [roomId]: nextStructures,
  });
};

export const getRoomTalkingAbout = (
  roomId: string,
): RoomTalkingAboutStructure[] => {
  // Entries written before `object` became numeric are still strings on disk.
  return (readStoredRoomTalkingAbout()[roomId] ?? [])
    .map((structure) => ({
      identifier: structure.identifier,
      object: Number(structure.object),
    }))
    .filter((structure) => Number.isInteger(structure.object));
};

/**
 * What the first message of a chat should carry.
 *
 * A chat started *about* something ("Talk about", or "New chat" in a model's
 * chat tab) attaches that something to its opening message, so the replyer
 * knows what is being asked about. Only the opening message: once the room has
 * messages the structure is already in the conversation.
 *
 * `about` is what the surface knows the chat is about (the sidebar's own
 * structure); without it, what was remembered when the room was created.
 */
export const firstMessageAttachments = (
  room: { id: string; messages: readonly unknown[] },
  about?: readonly RoomTalkingAboutStructure[],
): RoomTalkingAboutStructure[] => {
  if (room.messages.length > 0) {
    return [];
  }

  return about && about.length > 0 ? [...about] : getRoomTalkingAbout(room.id);
};
