import { describe, expect, it } from "vitest";
import { DemandKind, PortKind } from "@/rekuest/api/graphql";
import {
  GENERIC_REPLYER_FILTER,
  replyerSubject,
  specificReplyerFilter,
  splitReplyers,
  subjectArgKey,
  subjectWire,
} from "./replyerSubject";

const image = { identifier: "@mikro/image", object: 1 };
const dataset = { identifier: "@mikro/dataset", object: 2 };
const scene = { identifier: "@mikro/scene", object: 3 };

const message = (createdAt: string, attachedStructures = [] as typeof image[]) => ({
  createdAt,
  attachedStructures,
});

describe("the structure a reply is about", () => {
  it("is what is staged in the composer first", () => {
    expect(
      replyerSubject({
        staged: [image],
        messages: [message("2026-10-19T10:00:00Z", [dataset])],
        about: [scene],
      }),
    ).toBe(image);
  });

  it("is what the latest message carried, whatever order the messages come in", () => {
    expect(
      replyerSubject({
        staged: [],
        messages: [
          message("2026-10-19T11:00:00Z", [dataset]),
          message("2026-10-19T12:00:00Z"),
          message("2026-10-19T10:00:00Z", [image]),
        ],
        about: [scene],
      }),
    ).toBe(dataset);
  });

  it("is what the room was opened about, else nothing", () => {
    expect(replyerSubject({ staged: [], messages: [message("x")], about: [scene] })).toBe(scene);
    expect(replyerSubject({ staged: [], messages: [], about: [] })).toBeUndefined();
  });
});

describe("the replyer filters", () => {
  it("ask for a structure of the subject's kind beside the message, in one demand", () => {
    expect(specificReplyerFilter("@mikro/image").demands).toEqual([
      {
        kind: DemandKind.Args,
        matches: [
          { kind: PortKind.Structure, identifier: "@alpaka/message" },
          { kind: PortKind.Structure, identifier: "@mikro/image" },
        ],
      },
      GENERIC_REPLYER_FILTER.demands?.[1],
    ]);
  });
});

describe("the argument that takes the subject", () => {
  const args = [
    { key: "message", kind: PortKind.Structure, identifier: "@alpaka/message" },
    { key: "other", kind: PortKind.Structure, identifier: "@mikro/dataset" },
    { key: "image", kind: PortKind.Structure, identifier: "@mikro/image" },
  ];

  it("is a structure of its kind, never the message", () => {
    expect(subjectArgKey(args, image, "message")).toBe("image");
    expect(subjectArgKey(args, { identifier: "@alpaka/message", object: 9 }, "message")).toBeUndefined();
    expect(subjectArgKey(args, scene, "message")).toBeUndefined();
    expect(subjectArgKey(args, undefined, "message")).toBeUndefined();
  });

  it("is handed the subject in rekuest's wire form", () => {
    expect(subjectWire(image)).toEqual({ __identifier: "@mikro/image", object: "1" });
  });
});

describe("splitting the replyers", () => {
  it("lists the specific ones apart, and the rest without them, each in its order", () => {
    const a = { id: "a" };
    const b = { id: "b" };
    const c = { id: "c" };
    expect(splitReplyers([a, b, c], [c, a])).toEqual({ specific: [c, a], rest: [b] });
  });
});
