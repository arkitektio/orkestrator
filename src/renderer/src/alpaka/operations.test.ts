// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { ALPAKA_OPERATIONS } from "./operations";

const startRoom = ALPAKA_OPERATIONS["alpaka.startRoom"];

const client = () => {
  const mutate = vi
    .fn()
    .mockResolvedValueOnce({ data: { createRoom: { id: "room-1" } } })
    .mockResolvedValueOnce({ data: { send: { id: "msg-7" } } });
  return { mutate } as never as { mutate: ReturnType<typeof vi.fn> };
};

describe("alpaka.startRoom", () => {
  it("opens a room about the structures, posts the message, and answers both ids", async () => {
    const c = client();
    const result = await startRoom.run(c as never, {
      title: "Room: hi",
      text: "hi",
      about: [{ identifier: "@mikro/image", id: "42" }],
    });
    expect(result).toEqual({ roomId: "room-1", messageId: "msg-7" });
    const [createCall, sendCall] = c.mutate.mock.calls;
    expect(createCall[0].variables.input).toMatchObject({
      title: "Room: hi",
      talkingAbout: [{ identifier: "@mikro/image", object: 42 }],
    });
    expect(sendCall[0].variables.input).toMatchObject({ text: "hi", room: "room-1" });
  });

  it("refuses when nothing selected can be attached", async () => {
    await expect(
      startRoom.run(client() as never, { text: "hi", about: [{ identifier: "@kraph/graph", id: "x" }] }),
    ).rejects.toThrow(/can be attached/);
  });
});
