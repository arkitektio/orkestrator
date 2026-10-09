import { beforeEach, describe, expect, it } from "vitest";

import type { ListCallFragment } from "@/lovekit/api/graphql";

import { callAnnouncementStore } from "./announcements";

const call = (id: string, participantCount = 0): ListCallFragment => ({
  id,
  title: `Call ${id}`,
  roomName: `call-${id}`,
  createdAt: "2026-10-09T12:00:00Z",
  creator: { id: "7", sub: "7", preferredUsername: "ada" },
  about: [{ identifier: "@mikro/image", object: 42 }],
  participantCount,
});

const store = () => callAnnouncementStore.getState();
const ids = () => store().calls.map((announced) => announced.id);

beforeEach(() => store().clear());

describe("call announcements", () => {
  it("announces a call once, newest first", () => {
    store().announce(call("1"));
    store().announce(call("2"));
    store().announce(call("1"));
    expect(ids()).toEqual(["2", "1"]);
  });

  it("stops announcing a call that was joined or put away", () => {
    store().announce(call("1"));
    store().announce(call("2"));
    store().dismiss("1");
    expect(ids()).toEqual(["2"]);
  });

  it("drops the calls that ended and refreshes the ones still live", () => {
    store().announce(call("1"));
    store().announce(call("2"));
    store().sync(["1", "2"], [call("2", 3)]);
    expect(ids()).toEqual(["2"]);
    expect(store().calls[0].participantCount).toBe(3);
  });

  it("keeps a call announced after the server was asked", () => {
    store().announce(call("1"));
    store().announce(call("2"));
    // The answer is about call 1 only; call 2 arrived while it was on its way.
    store().sync(["1"], []);
    expect(ids()).toEqual(["2"]);
  });
});
