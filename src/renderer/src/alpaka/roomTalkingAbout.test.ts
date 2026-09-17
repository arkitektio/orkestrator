import { afterEach, describe, expect, it, vi } from "vitest";
import {
  firstMessageAttachments,
  storeRoomTalkingAbout,
  toStructureInput,
  toStructureInputs,
} from "./roomTalkingAbout";

// Alpaka's `StructureInput.object` is `Int!`, while the app-level `Structure`
// carries `object.id` as a string. Everything handing a structure to alpaka
// goes through these two, so this is where that boundary is pinned down.
describe("toStructureInput", () => {
  it("coerces a numeric string id to a number", () => {
    expect(
      toStructureInput({ identifier: "@mikro/image", object: { id: "42" } }),
    ).toEqual({ identifier: "@mikro/image", object: 42 });
  });

  it("passes a numeric id through", () => {
    expect(
      toStructureInput({ identifier: "@mikro/image", object: { id: 42 } }),
    ).toEqual({ identifier: "@mikro/image", object: 42 });
  });

  it.each([
    ["a non-numeric id", { id: "abc" }],
    ["a non-integer id", { id: "1.5" }],
    ["an empty id", { id: "" }],
    ["a null id", { id: null }],
    ["a missing object", null],
  ])("rejects %s", (_label, object) => {
    expect(toStructureInput({ identifier: "@mikro/image", object })).toBeNull();
  });
});

describe("toStructureInputs", () => {
  it("keeps the addressable structures and drops the rest", () => {
    expect(
      toStructureInputs([
        { identifier: "@mikro/image", object: { id: "1" } },
        { identifier: "@kraph/graph", object: { id: "not-a-number" } },
        { identifier: "@mikro/folder", object: { id: "3" } },
      ]),
    ).toEqual([
      { identifier: "@mikro/image", object: 1 },
      { identifier: "@mikro/folder", object: 3 },
    ]);
  });

  it("returns an empty list when nothing is addressable", () => {
    expect(
      toStructureInputs([{ identifier: "@kraph/graph", object: { id: "x" } }]),
    ).toEqual([]);
  });
});

// A chat started about something ("Talk about", or "New chat" in a model's chat
// tab) attaches that something to its opening message — and only that one.
describe("firstMessageAttachments", () => {
  const image = { identifier: "@mikro/image", object: 42 };

  const stubStorage = () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
    });
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("attaches what the surface says the chat is about", () => {
    expect(firstMessageAttachments({ id: "1", messages: [] }, [image])).toEqual([
      image,
    ]);
  });

  it("falls back to what was remembered when the room was created", () => {
    stubStorage();
    storeRoomTalkingAbout("7", [image]);

    expect(firstMessageAttachments({ id: "7", messages: [] })).toEqual([image]);
    expect(firstMessageAttachments({ id: "8", messages: [] })).toEqual([]);
  });

  it("attaches nothing once the room has messages", () => {
    stubStorage();
    storeRoomTalkingAbout("7", [image]);

    expect(firstMessageAttachments({ id: "7", messages: [{}] }, [image])).toEqual(
      [],
    );
  });
});
