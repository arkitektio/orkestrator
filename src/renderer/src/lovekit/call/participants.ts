import type { CallParticipantFragment } from "../api/graphql";

/**
 * Who is in a call after one `callParticipants` event: someone joining is
 * added (or replaces their earlier entry: a rejoin), someone leaving goes.
 */
export const applyParticipantEvent = (
  participants: readonly CallParticipantFragment[],
  event: { joined?: CallParticipantFragment | null; left?: { identity: string } | null },
): CallParticipantFragment[] => {
  if (event.joined) {
    const joined = event.joined;
    return [...participants.filter((p) => p.identity !== joined.identity), joined];
  }
  if (event.left) {
    const identity = event.left.identity;
    return participants.filter((p) => p.identity !== identity);
  }
  return [...participants];
};
