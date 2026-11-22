import { describe, expect, it } from "vitest";
import { MembershipRequestStatus, type MembershipRequestFragment } from "../api/graphql";
import { applyMembershipRequestEvent } from "./membershipRequests";

const request = (id: string, status = MembershipRequestStatus.Pending): MembershipRequestFragment => ({
  __typename: "MembershipRequest",
  id,
  reason: null,
  status,
  createdAt: "2026-11-22T00:00:00Z",
  user: { __typename: "User", id: `u${id}`, username: `user${id}` },
});

describe("applyMembershipRequestEvent", () => {
  it("puts a new request first", () => {
    expect(applyMembershipRequestEvent([request("1")], { create: request("2") }).map((r) => r.id)).toEqual(["2", "1"]);
  });

  it("drops an answered request", () => {
    const answered = request("1", MembershipRequestStatus.Approved);
    expect(applyMembershipRequestEvent([request("1"), request("2")], { update: answered }).map((r) => r.id)).toEqual(["2"]);
  });

  it("does not list a request twice", () => {
    expect(applyMembershipRequestEvent([request("1")], { create: request("1") }).map((r) => r.id)).toEqual(["1"]);
  });
});
