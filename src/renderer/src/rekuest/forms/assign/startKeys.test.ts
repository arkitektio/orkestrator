// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { submitsOnlyByAccident } from "./startKeys";

const enter = (target: Element, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent("keydown", { key: "Enter", ...init });
  Object.defineProperty(event, "target", { value: target });
  return { key: event.key, ctrlKey: event.ctrlKey, metaKey: event.metaKey, target: event.target, nativeEvent: event };
};

describe("the assign form starts from its button", () => {
  it("does not start on Enter in a field, and does on the button, its shortcut and a new line", () => {
    const field = document.createElement("input");
    const number = Object.assign(document.createElement("input"), { type: "number" });
    expect(submitsOnlyByAccident(enter(field))).toBe(true);
    expect(submitsOnlyByAccident(enter(number))).toBe(true);

    expect(submitsOnlyByAccident(enter(document.createElement("button")))).toBe(false);
    expect(submitsOnlyByAccident(enter(Object.assign(document.createElement("input"), { type: "submit" })))).toBe(false);
    expect(submitsOnlyByAccident(enter(field, { ctrlKey: true }))).toBe(false);
    expect(submitsOnlyByAccident(enter(field, { metaKey: true }))).toBe(false);
    expect(submitsOnlyByAccident(enter(document.createElement("textarea")))).toBe(false);
    expect(submitsOnlyByAccident(enter(field, { isComposing: true }))).toBe(false);
    expect(submitsOnlyByAccident({ ...enter(field), key: "a" })).toBe(false);
  });
});
