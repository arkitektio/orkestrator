import { describe, expect, it, vi } from "vitest";
import { createContextGesture, type ContextPointerSample } from "./sceneContextGesture";

const at = (clientX: number, clientY: number, rest: Partial<ContextPointerSample> = {}): ContextPointerSample => ({
  button: 2,
  buttons: 2,
  ctrlKey: false,
  clientX,
  clientY,
  ...rest,
});

const gesture = (mac = false) => {
  const onClick = vi.fn();
  return { onClick, ...createContextGesture({ mac, onClick }) };
};

describe("scene context gesture", () => {
  it("opens on a right button that went down and up in place", () => {
    const g = gesture();
    g.down(at(10, 10));
    g.up(at(11, 10, { buttons: 0 }));
    expect(g.onClick).toHaveBeenCalledExactlyOnceWith({ x: 11, y: 10 });
  });

  it("does not open after a drag (a pan or an orbit)", () => {
    const g = gesture();
    g.down(at(10, 10));
    g.move(at(80, 10));
    g.up(at(10, 10, { buttons: 0 }));
    expect(g.onClick).not.toHaveBeenCalled();
  });

  it("ignores the left button, and Control-click off macOS", () => {
    const g = gesture(false);
    g.down(at(10, 10, { button: 0, buttons: 1, ctrlKey: true }));
    g.up(at(10, 10, { button: 0, buttons: 0, ctrlKey: true }));
    expect(g.onClick).not.toHaveBeenCalled();
  });

  it("takes Control-click as the secondary click on macOS", () => {
    const g = gesture(true);
    g.down(at(10, 10, { button: 0, buttons: 1, ctrlKey: true }));
    g.up(at(10, 10, { button: 0, buttons: 0, ctrlKey: true }));
    expect(g.onClick).toHaveBeenCalledExactlyOnceWith({ x: 10, y: 10 });
  });

  it("opens at the press when the release is never reported", () => {
    const g = gesture(true);
    g.down(at(10, 10));
    // The first move with nothing held, wherever the pointer drifted to.
    g.move(at(60, 40, { buttons: 0 }));
    expect(g.onClick).toHaveBeenCalledExactlyOnceWith({ x: 10, y: 10 });
    // The late release, if it comes after all, opens nothing more.
    g.up(at(60, 40, { buttons: 0 }));
    expect(g.onClick).toHaveBeenCalledTimes(1);
  });
});
