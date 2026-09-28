/**
 * Turn whatever electron-updater threw into something a person can read.
 *
 * Its errors are written for the log: "Cannot find latest-mac.yml in the latest
 * release artifacts (https://…): HttpError: 404 …" followed by a stack and the
 * response headers. The common case behind that one is not a failure at all —
 * CI tags the release first and uploads the builds minutes later, so a check
 * in that window finds a release with nothing in it yet. That gets its own
 * kind, `pending`, which the UI shows as "try again shortly" rather than as an
 * error.
 *
 * Classified by the error's `code` when main forwards it, and by the message
 * otherwise — `String(err)` drops the code, and older main builds sent only that.
 */

export type UpdateProblemKind =
  | "pending"
  | "offline"
  | "rate-limited"
  | "no-release"
  | "signature"
  | "unknown";

export type UpdateProblem = {
  kind: UpdateProblemKind;
  /** One short line: the rail row and the alert heading. */
  title: string;
  /** A sentence of what it means and what to do. */
  message: string;
  /** The version whose release was found incomplete, when the URL names it. */
  version?: string;
  /** The updater's own text, trimmed of stack and headers, for "Details". */
  detail: string;
};

/**
 * The files a release is checked and downloaded through. Any of them missing
 * from an existing release means its builds are not up yet.
 */
const PENDING_CODES = new Set([
  "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND",
  "ERR_UPDATER_ASSET_NOT_FOUND",
  "ERR_UPDATER_ZIP_FILE_NOT_FOUND",
]);

const NO_RELEASE_CODES = new Set([
  "ERR_UPDATER_NO_PUBLISHED_VERSIONS",
  "ERR_UPDATER_LATEST_VERSION_NOT_FOUND",
  "ERR_UPDATER_RELEASE_NOT_FOUND",
]);

const OFFLINE_RE =
  /net::ERR_(INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|NETWORK_CHANGED|CONNECTION_(REFUSED|RESET|TIMED_OUT|CLOSED)|TIMED_OUT|ADDRESS_UNREACHABLE|PROXY_CONNECTION_FAILED)|\b(ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENETUNREACH)\b/;

/** A release asset URL — `…/releases/download/v2.14.0/latest-mac.yml`. */
const RELEASE_ASSET_RE = /\/releases\/download\/v?([^/\s)]+)\/([^/\s)]+)/;

const PENDING_MESSAGE_RE =
  /Cannot find (?:\S+\.yml in the latest release artifacts|channel)|\b404\b[\s\S]*\/releases\/download\//;

type RawError = { message: string; code?: string };

const readRaw = (error: unknown): RawError => {
  if (error && typeof error === "object") {
    const e = error as { message?: unknown; code?: unknown };
    if (typeof e.message === "string") {
      return {
        message: e.message,
        code: typeof e.code === "string" ? e.code : undefined,
      };
    }
  }
  return { message: String(error ?? "") };
};

/**
 * The updater's message without the parts nobody reads: `Error: ` prefixes,
 * the stack, and the dumped response headers that follow an HttpError.
 */
export const trimUpdaterMessage = (message: string): string => {
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("at "));
  const kept: string[] = [];
  for (const line of lines) {
    // HttpError appends `Headers: { … }` on its own line; everything from
    // there on is a header dump.
    if (/^Headers:/.test(line) || /^"[\w-]+":/.test(line)) break;
    kept.push(line);
  }
  return kept.join("\n").replace(/^(Error: )+/, "");
};

export const describeUpdateError = (error: unknown): UpdateProblem => {
  const { message, code } = readRaw(error);
  const detail = trimUpdaterMessage(message) || "Unknown error";
  const asset = RELEASE_ASSET_RE.exec(message);

  if (
    (code && PENDING_CODES.has(code)) ||
    (!code && PENDING_MESSAGE_RE.test(message))
  ) {
    const version = asset?.[1];
    return {
      kind: "pending",
      title: version ? `Update ${version} is on its way` : "Update is on its way",
      message:
        "A new release was published, but its builds are still being uploaded. " +
        "Nothing is wrong — the app checks again on its own in a few minutes.",
      version,
      detail,
    };
  }

  if (code && NO_RELEASE_CODES.has(code)) {
    return {
      kind: "no-release",
      title: "No release found",
      message: "There is no published release on this update channel yet.",
      detail,
    };
  }

  if (OFFLINE_RE.test(message)) {
    return {
      kind: "offline",
      title: "Couldn't reach the update server",
      message: "Check your internet connection and try again.",
      detail,
    };
  }

  if (/rate limit|\b429\b/i.test(message)) {
    return {
      kind: "rate-limited",
      title: "Too many update checks",
      message:
        "GitHub is limiting requests from this network for now. Try again later.",
      detail,
    };
  }

  if (
    code === "ERR_UPDATER_INVALID_SIGNATURE" ||
    /code signature|not signed|signature verification/i.test(message)
  ) {
    return {
      kind: "signature",
      title: "Update couldn't be verified",
      message:
        "The downloaded update failed its signature check and was not installed.",
      detail,
    };
  }

  return {
    kind: "unknown",
    title: "Update failed",
    // The first line is usually the one that says what happened.
    message: detail.split("\n")[0],
    detail,
  };
};
