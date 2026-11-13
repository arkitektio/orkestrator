import { splitRefreshResponse, type RefreshResult } from "../fakts/pollToken";
import { TokenResponse } from "../fakts/tokenSchema";
import { toast } from "@/core/notify";

const TOKEN_REFRESH_SKEW_MS = 60_000;

export const normalizeToken = (token: TokenResponse): TokenResponse => ({
  ...token,
  received_at: token.received_at ?? Date.now(),
});

export const shouldRefreshToken = (token: TokenResponse): boolean => {
  if (!token.expires_in || !token.received_at) {
    return false;
  }

  const expiresAt = token.received_at + token.expires_in * 1000;
  return Date.now() >= expiresAt - TOKEN_REFRESH_SKEW_MS;
};

/**
 * A token endpoint that answered, and said no.
 *
 * Switching to a parked profile has to tell three failures apart: a refresh
 * token the server has retired (the profile is dead until re-approved), a
 * deployment we simply could not reach (the credential is fine), and everything
 * else. Only the first is worth marking a profile stale over, and a bare
 * `Error` message cannot carry that distinction reliably.
 */
export class RefreshTokenError extends Error {
  readonly status: number;
  /** The OAuth2 `error` member, e.g. `invalid_grant`. */
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "RefreshTokenError";
    this.status = status;
    this.code = code;
  }
}

export const isAbortLikeError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("cancel") ||
    error.message.includes("Cancel") ||
    error.message.includes("aborted") ||
    error.message.includes("Abort") ||
    error.message.includes("User Cancelled")
  );
};

/**
 * What this app is NOW, sent along with every refresh.
 *
 * lok compares it with the manifest that was approved. After an update it
 * differs: if it asks for nothing more, lok moves this installation to the new
 * release by itself (same session, same `client_id` here); if it asks for
 * more, lok changes nothing and answers `manifest_status: "approval_required"`.
 *
 * Only ever the ENHANCED manifest (with this machine's node id): one without
 * it reads to lok as another device. The controller sets it once it has one.
 */
let offeredManifest: (() => unknown | undefined) | null = null;
/** Starts a new approval for the live profile, when it is `tokenEndpoint`'s (the controller's `reconnect`). */
let approve: ((tokenEndpoint: string) => (() => void) | undefined) | null = null;

export const offerManifestOnRefresh = (
  get: (() => unknown | undefined) | null,
  approveFor: ((tokenEndpoint: string) => (() => void) | undefined) | null = null,
): void => {
  offeredManifest = get;
  approve = approveFor;
  approvalAsked.clear();
};

/** Deployments already told about, by token endpoint: a parked profile's must not use up the live one's. */
const approvalAsked = new Set<string>();

/** Tell the user, once per deployment and window, that this version needs approving again. */
const askForApproval = (tokenEndpoint: string) => {
  if (approvalAsked.has(tokenEndpoint)) return;
  approvalAsked.add(tokenEndpoint);
  const start = approve?.(tokenEndpoint);
  toast.info("This version of Orkestrator needs your approval", {
    id: `manifest-approval:${tokenEndpoint}`,
    description: start
      ? "It asks for more than you approved before, and keeps working with what was approved until you approve the rest."
      : "It asks for more than you approved before on one of your accounts. It keeps working there with what was approved; sign in to that account again to approve the rest.",
    duration: Infinity,
    action: start ? { label: "Approve", onClick: start } : undefined,
  });
};

/**
 * Refresh as a public client: `client_id` only, no secret.
 *
 * The refresh token rotates on every use, so the returned one must always be
 * persisted. The response also carries a freshly re-rendered fakts envelope
 * (instance aliases are resolved against the requesting host), which is how
 * configuration changes reach us without a human re-approving — hence the
 * `fakts` half of the result — which is `null` when the server could not
 * render one, in which case the caller keeps the config it already has.
 */
export const refreshAccessToken = async (
  tokenEndpoint: string,
  currentToken: TokenResponse,
  controller?: AbortController,
): Promise<RefreshResult> => {
  if (!currentToken.refresh_token) {
    throw new Error("No refresh token available – cannot refresh");
  }

  const manifest = offeredManifest?.();
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: currentToken.refresh_token,
      client_id: currentToken.client_id,
      ...(manifest ? { manifest: JSON.stringify(manifest) } : {}),
    }),
    signal: controller?.signal,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new RefreshTokenError(
      `Failed to refresh token: ${response.status} ${response.statusText}\n${JSON.stringify(json)}`,
      response.status,
      typeof json?.error === "string" ? json.error : undefined,
    );
  }

  if (json?.manifest_status === "approval_required") askForApproval(tokenEndpoint);

  return splitRefreshResponse(json);
};
