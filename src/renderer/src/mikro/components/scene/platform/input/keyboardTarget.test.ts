import { describe, expect, it } from "vitest";
import { isSceneNavigationTarget, isTypingTarget } from "./keyboardTarget";

describe("isTypingTarget", () => {
  it("is false without a target", () => {
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(undefined)).toBe(false);
  });

  it.each(["INPUT", "TEXTAREA", "SELECT"])("is true for <%s>", (tagName) => {
    expect(isTypingTarget({ tagName })).toBe(true);
  });

  it("is true for a contenteditable host of any tag", () => {
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("is false for the canvas and ordinary elements", () => {
    expect(isTypingTarget({ tagName: "CANVAS" })).toBe(false);
    expect(isTypingTarget({ tagName: "DIV" })).toBe(false);
    expect(isTypingTarget({ tagName: "BUTTON" })).toBe(false);
  });
});

describe("isSceneNavigationTarget", () => {
  it("claims the keys when nothing is focused", () => {
    expect(isSceneNavigationTarget({ tagName: "BODY" })).toBe(true);
    expect(isSceneNavigationTarget(null)).toBe(true);
    expect(isSceneNavigationTarget(undefined)).toBe(true);
  });

  it("claims them for the canvas itself", () => {
    expect(isSceneNavigationTarget({ tagName: "CANVAS" })).toBe(true);
  });

  it("yields to a focused control that handles arrows itself", () => {
    // The Z and dim scrubbers are Radix sliders: a focused thumb owns the
    // arrow keys, and panning at the same time would double-handle the press.
    expect(isSceneNavigationTarget({ tagName: "SPAN" })).toBe(false);
    expect(isSceneNavigationTarget({ tagName: "BUTTON" })).toBe(false);
    expect(isSceneNavigationTarget({ tagName: "DIV" })).toBe(false);
  });

  it("yields to anything you can type into", () => {
    expect(isSceneNavigationTarget({ tagName: "INPUT" })).toBe(false);
    expect(isSceneNavigationTarget({ tagName: "DIV", isContentEditable: true })).toBe(false);
  });
});
