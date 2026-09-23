// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const requestExport = vi.hoisted(() => vi.fn());
vi.mock("@/lib/export/exportRequests", () => ({ requestExport }));

import { onSmartDragEnd } from "./dragOut";

const structures = [{ identifier: "@mikro/file", object: { id: "1" } }];

const setPointerInApp = (inApp: boolean | undefined) => {
  // @ts-expect-error - stand in for the preload injection
  window.api =
    inApp === undefined ? undefined : { windowControls: { pointerInApp: async () => inApp } };
};

afterEach(() => {
  // @ts-expect-error - clean up the injected global
  delete window.api;
  vi.clearAllMocks();
});

describe("a card let go outside the app", () => {
  it("is brought to disk when nothing took it and no window of ours is under the pointer", async () => {
    setPointerInApp(false);
    await onSmartDragEnd({ dropEffect: "none", leftWindow: true }, { structures });
    expect(requestExport).toHaveBeenCalledWith(structures);
  });

  it("is left alone when another app took it", async () => {
    setPointerInApp(false);
    await onSmartDragEnd({ dropEffect: "copy", leftWindow: true }, { structures });
    expect(requestExport).not.toHaveBeenCalled();
  });

  it("is left alone when it ended over another window of ours", async () => {
    setPointerInApp(true);
    await onSmartDragEnd({ dropEffect: "none", leftWindow: true }, { structures });
    expect(requestExport).not.toHaveBeenCalled();
  });

  it("is left alone when it never left this window", async () => {
    setPointerInApp(false);
    await onSmartDragEnd({ dropEffect: "none", leftWindow: false }, { structures });
    expect(requestExport).not.toHaveBeenCalled();
  });

  it("does nothing in a browser, which has no desktop to drop on", async () => {
    setPointerInApp(undefined);
    await onSmartDragEnd({ dropEffect: "none", leftWindow: true }, { structures });
    expect(requestExport).not.toHaveBeenCalled();
  });
});
