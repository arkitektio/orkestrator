import { StructureInput } from "@/alpaka/api/graphql";

/**
 * A message the user has sent but the room has not delivered back yet.
 *
 * Sending used to blur the whole conversation behind an "Adding..." card,
 * which hid the very thing being added. Instead the message is put in the list
 * straight away and pulses until the real one takes its place.
 *
 * Two hops, not one: the mutation returns an id, but the row only becomes a
 * real message when it arrives through the room subscription. So a pending row
 * stops pulsing when the server acknowledges it and is dropped when its id
 * shows up in the room — never on a timer, which would blink the message out
 * of a conversation it was accepted into.
 */
export interface PendingMessage {
  /** Ours, never the server's — the row's key while it has no real id. */
  localId: string;
  text: string;
  attachedStructures: readonly StructureInput[];
  createdAt: string;
  /** The id the server gave it, once the mutation came back. */
  serverId?: string;
}

/** Still in flight: this is what pulses. */
export const isUnconfirmed = (pending: PendingMessage) => !pending.serverId;

export const startPending = (
  pendings: readonly PendingMessage[],
  localId: string,
  text: string,
  attachedStructures: readonly StructureInput[],
  createdAt: string,
): PendingMessage[] => [
  ...pendings,
  { localId, text, attachedStructures, createdAt },
];

/** The mutation came back: the row is real, it just is not in the room yet. */
export const confirmPending = (
  pendings: readonly PendingMessage[],
  localId: string,
  serverId: string,
): PendingMessage[] =>
  pendings.map((pending) =>
    pending.localId === localId ? { ...pending, serverId } : pending,
  );

export const dropPending = (
  pendings: readonly PendingMessage[],
  localId: string,
): PendingMessage[] =>
  pendings.filter((pending) => pending.localId !== localId);

/**
 * Drop the rows the room now carries itself. Returns the same array when
 * nothing changed, so this can run on every render of the message list.
 */
export const settlePending = (
  pendings: readonly PendingMessage[],
  messages: readonly { id: string }[],
): PendingMessage[] => {
  if (pendings.length === 0) return pendings as PendingMessage[];

  const delivered = new Set(messages.map((message) => message.id));
  const next = pendings.filter(
    (pending) => !pending.serverId || !delivered.has(pending.serverId),
  );

  return next.length === pendings.length ? (pendings as PendingMessage[]) : next;
};
