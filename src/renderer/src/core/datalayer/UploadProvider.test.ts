import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUploadStore } from "./UploadProvider";

const file = (name: string) => new File(["x"], name);

describe("upload store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // The store looks for the Electron bridge's progress channel; none here.
    vi.stubGlobal("window", {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps a finished upload that links to what it created", async () => {
    const store = createUploadStore();
    const refs = { object: { identifier: "@mikro/file", id: "1" } };
    await store.getState().startUpload(file("a.tif"), async () => "key", async () => refs);

    vi.advanceTimersByTime(60_000);

    const [task] = store.getState().uploads;
    expect(task).toMatchObject({ fileName: "a.tif", status: "completed", refs });
  });

  it("evicts a finished upload with nothing to link to", async () => {
    const store = createUploadStore();
    await store.getState().startUpload(file("a.tif"), async () => "key", async () => undefined);
    expect(store.getState().uploads).toHaveLength(1);

    vi.advanceTimersByTime(60_000);

    expect(store.getState().uploads).toHaveLength(0);
  });

  it("dismisses a finished upload without aborting it", async () => {
    const store = createUploadStore();
    let signal: AbortSignal | undefined;
    await store.getState().startUpload(
      file("a.tif"),
      async (_file, options) => {
        signal = options.signal;
        return "key";
      },
      async () => ({ object: { identifier: "@mikro/file", id: "1" } }),
    );

    store.getState().cancelUpload(store.getState().uploads[0].id);

    expect(store.getState().uploads).toHaveLength(0);
    expect(signal?.aborted).toBe(false);
  });
});
