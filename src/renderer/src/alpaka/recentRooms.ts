import type { RecentRoomFragment } from "./api/graphql";

export type RecentRoom = Omit<RecentRoomFragment, "lastActivity"> & {
  /** Latest message time, or the room's creation time for empty rooms (the server's `lastActivity`). */
  lastActivity: number;
  preview: string | null;
};

export type RoomBucket = "Today" | "Yesterday" | "This week" | "Earlier";

const toTime = (value: unknown): number => {
  const time = new Date(value as string).getTime();
  return Number.isFinite(time) ? time : 0;
};

/**
 * Rooms as the home page lists them. The server orders them by their latest message
 * (`RoomOrder.lastMessageAt`) and says when that was (`lastActivity`), so a room with
 * new activity is found however old it is; this only reads the time and the preview.
 */
export const toRecentRooms = (rooms: readonly RecentRoomFragment[]): RecentRoom[] =>
  rooms.map((room) => ({
    ...room,
    lastActivity: toTime(room.lastActivity),
    preview: room.latest[0]?.text?.trim() || null,
  }));

export const bucketFor = (time: number, now: Date = new Date()): RoomBucket => {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (time >= startOfToday) return "Today";
  if (time >= startOfToday - day) return "Yesterday";
  if (time >= startOfToday - 6 * day) return "This week";
  return "Earlier";
};

export const groupByBucket = (
  rooms: readonly RecentRoom[],
  now: Date = new Date(),
): { bucket: RoomBucket; rooms: RecentRoom[] }[] => {
  const groups = new Map<RoomBucket, RecentRoom[]>();
  for (const room of rooms) {
    const bucket = bucketFor(room.lastActivity, now);
    groups.set(bucket, [...(groups.get(bucket) ?? []), room]);
  }
  return [...groups.entries()].map(([bucket, rooms]) => ({ bucket, rooms }));
};

/** A short room title from the first line of the opening message. */
export const titleFromPrompt = (prompt: string, max = 60): string => {
  const line = prompt.trim().split("\n")[0].trim();
  if (!line) return "New chat";
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
};

export const greeting = (now: Date = new Date()): string => {
  const hour = now.getHours();
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};
