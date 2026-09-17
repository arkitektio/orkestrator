// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { SMART_MODEL_DROP_TYPE } from "@/constants";
import type { DropPayload, ExternalDropPayload, InternalDragSession } from "@/lib/dnd/engine";
import {
  acceptsSmartDrag,
  getSmartDragStructures,
  getSmartDropObjects,
  resolveSmartDrop,
  smartExternalData,
  STRUCTURES_MIME,
} from "./dragPayload";

const image = { identifier: "@mikro/image", object: { id: "12", name: "cells" } };
const roi = { identifier: "@mikro/roi", object: { id: "9f3c-uuid" } };

const internal = (
  data: unknown,
  over: Partial<InternalDragSession> = {},
): DropPayload => ({
  origin: "internal",
  kind: SMART_MODEL_DROP_TYPE,
  data,
  modifiers: { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false },
  source: null as unknown as HTMLElement,
  ...over,
});

const external = (data: Record<string, string>): ExternalDropPayload => ({
  origin: "external",
  types: Object.keys(data),
  data,
  files: [],
});

describe("a smart drag inside the window", () => {
  it("hands over its structures", () => {
    expect(resolveSmartDrop(internal({ structures: [image] }))).toEqual({
      partners: [image],
      omitDefaultBehaviour: false,
    });
  });

  it("skips the registered drop handlers when Ctrl was held as it began", () => {
    const payload = internal(
      { structures: [image] },
      { modifiers: { ctrlKey: true, shiftKey: false, altKey: false, metaKey: false } },
    );
    expect(resolveSmartDrop(payload)?.omitDefaultBehaviour).toBe(true);
  });

  it("is not read out of a drag of another kind", () => {
    expect(resolveSmartDrop(internal({ structures: [image] }, { kind: "row" }))).toBeNull();
  });
});

describe("a smart drag seen from another window", () => {
  it("round-trips every structure, whole", () => {
    const partners = resolveSmartDrop(external(smartExternalData([image, roi])))?.partners;
    expect(partners).toEqual([image, roi]);
  });

  it("reads a link as the object it names — an id that is not JSON included", () => {
    // The link used to be run through JSON.parse: a numeric id came out as a
    // bare number in place of the object, and any other id threw.
    const { "text/uri-list": uriList } = smartExternalData([image, roi]);
    expect(resolveSmartDrop(external({ "text/uri-list": uriList }))?.partners).toEqual([
      { identifier: "@mikro/image", object: { id: "12" } },
      { identifier: "@mikro/roi", object: { id: "9f3c-uuid" } },
    ]);
  });

  it("falls back to a structure as plain text", () => {
    const partners = resolveSmartDrop(external({ "text/plain": JSON.stringify(image) }))?.partners;
    expect(partners).toEqual([image]);
  });

  it("finds nothing in text that is not a structure", () => {
    expect(resolveSmartDrop(external({ "text/plain": "blok-12" }))).toBeNull();
    expect(resolveSmartDrop(external({ "text/uri-list": "https://arkitekt.live" }))).toBeNull();
    expect(resolveSmartDrop(external({ [STRUCTURES_MIME]: "{not json" }))).toBeNull();
  });
});

describe("whether a drag could be structures", () => {
  it("knows its own kind", () => {
    expect(acceptsSmartDrag(internal(null))).toBe(true);
    expect(acceptsSmartDrag(internal(null, { kind: "row" }))).toBe(false);
  });

  it("goes by the types of a drag from outside, and leaves files alone", () => {
    expect(acceptsSmartDrag({ origin: "external", types: [STRUCTURES_MIME] })).toBe(true);
    expect(acceptsSmartDrag({ origin: "external", types: ["text/plain"] })).toBe(true);
    expect(acceptsSmartDrag({ origin: "external", types: ["Files"] })).toBe(false);
  });
});

describe("what a drag carries", () => {
  const other = { identifier: "@mikro/image", object: { id: "40" } };

  it("is the card alone when it is not part of a selection", () => {
    expect(getSmartDragStructures([], image)).toEqual([image]);
    expect(getSmartDragStructures([roi, other], image)).toEqual([image]);
    // One selected card is not "several".
    expect(getSmartDragStructures([image], image)).toEqual([image]);
  });

  it("is the whole selection when the card is part of it, the grabbed card first", () => {
    expect(getSmartDragStructures([roi, image, other], image)).toEqual([image, roi, other]);
  });

  it("knows the card by what it names, not by the object in hand", () => {
    const again = { identifier: image.identifier, object: { id: image.object.id } };
    expect(getSmartDragStructures([roi, again], image)).toEqual([image, roi]);
  });
});

describe("the left side of a drop", () => {
  const dropped = { identifier: "@mikro/image", object: { id: "40" } };
  const target = { identifier: "@mikro/dataset", object: { id: "7" } };

  it("is the selection, dropping on one of the selected", () => {
    expect(getSmartDropObjects([image, roi], image, [dropped])).toEqual([image, roi]);
  });

  it("is the card alone when the selection is what was dropped on it", () => {
    expect(getSmartDropObjects([image, roi], target, [image, roi])).toEqual([target]);
  });

  it("is the card alone when the selection has nothing to do with it", () => {
    expect(getSmartDropObjects([image, roi], target, [dropped])).toEqual([target]);
  });

  it("is nothing at all, let go over a card that is being dragged", () => {
    expect(getSmartDropObjects([image, roi], roi, [image, roi])).toBeNull();
    expect(getSmartDropObjects([], image, [image])).toBeNull();
  });
});
