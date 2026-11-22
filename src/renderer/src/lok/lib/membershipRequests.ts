import { MembershipRequestStatus, type MembershipRequestFragment } from "../api/graphql";

/**
 * The open requests after one `membershipRequests` event: a new request is
 * put first (the list is newest first), an answered one leaves.
 */
export const applyMembershipRequestEvent = (
  pending: readonly MembershipRequestFragment[],
  event: { create?: MembershipRequestFragment | null; update?: MembershipRequestFragment | null },
): MembershipRequestFragment[] => {
  const changed = event.create ?? event.update;
  if (!changed) return [...pending];
  const rest = pending.filter((request) => request.id !== changed.id);
  return changed.status === MembershipRequestStatus.Pending ? [changed, ...rest] : rest;
};
