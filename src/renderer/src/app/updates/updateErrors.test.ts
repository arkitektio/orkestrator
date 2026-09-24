import { describe, expect, it } from "vitest";
import { describeUpdateError, trimUpdaterMessage } from "./updateErrors";

// The shape electron-updater's GitHub provider throws while CI is still
// uploading a release's builds (verbatim modulo the header dump).
const CHANNEL_FILE_MISSING =
  "Error: Cannot find latest-mac.yml in the latest release artifacts " +
  "(https://github.com/arkitektio/orkestrator/releases/download/v2.14.0/latest-mac.yml): " +
  "HttpError: 404 \n" +
  '"method: GET url: https://github.com/arkitektio/orkestrator/releases/download/v2.14.0/latest-mac.yml\n\n' +
  "Please double check that your authentication token is correct.\n" +
  "    at createHttpError (/app/node_modules/builder-util-runtime/out/httpExecutor.js:20:12)\n" +
  "Headers: {\n" +
  '  "access-control-allow-origin": "*",\n' +
  "}";

describe("describeUpdateError", () => {
  it("reads a missing channel file as a release still being published", () => {
    const problem = describeUpdateError({
      message: CHANNEL_FILE_MISSING,
      code: "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND",
    });
    expect(problem.kind).toBe("pending");
    expect(problem.version).toBe("2.14.0");
    expect(problem.title).toContain("2.14.0");
  });

  it("recognises it from the message alone, as older main builds sent it", () => {
    expect(describeUpdateError(CHANNEL_FILE_MISSING).kind).toBe("pending");
  });

  it("reads a 404 on a build download as pending too", () => {
    const problem = describeUpdateError(
      new Error(
        "HttpError: 404 \nurl: https://github.com/arkitektio/orkestrator/releases/download/v2.14.0-rc.1/Orkestrator-2.14.0-rc.1-arm64-mac.zip",
      ),
    );
    expect(problem).toMatchObject({ kind: "pending", version: "2.14.0-rc.1" });
  });

  it("keeps the header dump and stack out of the detail", () => {
    const detail = trimUpdaterMessage(CHANNEL_FILE_MISSING);
    expect(detail).not.toContain("Headers");
    expect(detail).not.toContain("access-control");
    expect(detail).not.toContain("httpExecutor.js");
    expect(detail.startsWith("Cannot find latest-mac.yml")).toBe(true);
  });

  it("names being offline", () => {
    expect(describeUpdateError("Error: net::ERR_INTERNET_DISCONNECTED").kind).toBe(
      "offline",
    );
    expect(describeUpdateError("getaddrinfo ENOTFOUND github.com").kind).toBe(
      "offline",
    );
  });

  it("names a missing release", () => {
    expect(
      describeUpdateError({
        message: "No published versions on GitHub",
        code: "ERR_UPDATER_NO_PUBLISHED_VERSIONS",
      }).kind,
    ).toBe("no-release");
  });

  it("names rate limiting and signature failures", () => {
    expect(describeUpdateError("HttpError: 403 API rate limit exceeded").kind).toBe(
      "rate-limited",
    );
    expect(
      describeUpdateError("Code signature at URL file:///… did not pass validation")
        .kind,
    ).toBe("signature");
  });

  it("falls back to the first line of anything else", () => {
    const problem = describeUpdateError(new Error("something odd\nmore context"));
    expect(problem).toMatchObject({
      kind: "unknown",
      title: "Update failed",
      message: "something odd",
      detail: "something odd\nmore context",
    });
  });
});
