import { beforeEach, describe, expect, it } from "vitest";
import {
  dismissUpdate,
  resetUpdateState,
  updateAvailable,
  updateChecking,
  updateDownloaded,
  updateError,
  updateNone,
  updateProgress,
  updateStore,
} from "./updateStore";

const state = () => updateStore.getState();

describe("updateStore", () => {
  beforeEach(resetUpdateState);

  it("starts idle", () => {
    expect(state().phase).toBe("idle");
    expect(state().dismissed).toBe(false);
  });

  it("follows the download through to ready", () => {
    updateChecking("Checking…");
    expect(state().phase).toBe("checking");

    updateAvailable({ version: "2.6.0" });
    expect(state()).toMatchObject({ phase: "available", version: "2.6.0" });

    updateProgress({ percent: 12.5 });
    expect(state()).toMatchObject({ phase: "downloading", percent: 12.5 });

    updateDownloaded({ version: "2.6.0" });
    expect(state()).toMatchObject({
      phase: "downloaded",
      percent: 100,
      version: "2.6.0",
    });
  });

  it("does not let a trailing progress tick undo a finished download", () => {
    updateAvailable({ version: "2.6.0" });
    updateDownloaded({ version: "2.6.0" });

    updateProgress({ percent: 99 });

    expect(state().phase).toBe("downloaded");
    expect(state().percent).toBe(100);
  });

  it("keeps the known version when the downloaded event carries none", () => {
    updateAvailable({ version: "2.6.0" });
    updateDownloaded(undefined);

    expect(state().version).toBe("2.6.0");
  });

  it("records an error with its message", () => {
    updateError(new Error("net::ERR_FAILED"));

    expect(state().phase).toBe("error");
    expect(state().error).toContain("net::ERR_FAILED");
  });

  it("reads a half-published release as pending, not as an error", () => {
    updateError({
      message:
        "Cannot find latest-mac.yml in the latest release artifacts (https://github.com/o/r/releases/download/v2.14.0/latest-mac.yml): HttpError: 404",
      code: "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND",
    });

    expect(state()).toMatchObject({ phase: "pending", version: "2.14.0" });
    expect(state().error).toBeUndefined();
    expect(state().problem?.kind).toBe("pending");
  });

  it("clears an error once a fresh check starts", () => {
    updateError("boom");
    updateChecking("Checking…");

    expect(state().error).toBeUndefined();
  });

  it("reports no update available", () => {
    updateProgress({ percent: 40 });
    updateNone();

    expect(state()).toMatchObject({ phase: "none", percent: undefined });
  });

  it("dismisses without losing the state the settings page shows", () => {
    updateAvailable({ version: "2.6.0" });
    updateDownloaded({ version: "2.6.0" });
    dismissUpdate();

    expect(state().dismissed).toBe(true);
    expect(state()).toMatchObject({ phase: "downloaded", version: "2.6.0" });
  });

  it("un-dismisses for a newer update", () => {
    dismissUpdate();
    updateAvailable({ version: "2.7.0" });

    expect(state().dismissed).toBe(false);
  });
});
