import { Arkitekt } from "@/core/connection/arkitekt/host";
import { Button } from "@/core/ui/button";
import { Textarea } from "@/core/ui/textarea";
import { useOperation } from "@/core/modules/hooks/useOperation";
import { profileScope, useActiveScope } from "@/core/tabs/sharing/use-active-scope";
import type { StoredProfile } from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import { rememberPendingShare } from "@/core/tabs/pendingShare";
import {
  decodeShareRequest,
  matchScope,
  scopeDigest,
  type ShareRequest,
} from "@/core/tabs/sharing/shareScope";
import { discover } from "@/core/connection/arkitekt/fakts/discover";
import { AlertCircle, Loader2 } from "lucide-react";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Where a shared link lands before it is allowed to become a page.
 *
 * A link naming an object (`/mikro/images/5`) is only meaningful on the
 * deployment it was copied from — the same path on another server opens a
 * different object without erroring. So a scoped link points here instead, and
 * this page decides: land silently when the scope already matches, ask before
 * switching when it does not, and refuse when there is nothing to switch to.
 * Someone signed into the link's server who is not a member of its
 * organization can ask to join from here.
 *
 * It renders its own confirmation rather than using the dialog registry
 * deliberately: `DialogProvider` wraps every dialog in `<Guard.Rekuest>`, which
 * renders nothing until that service is ready — and the cases this page exists
 * for are exactly the ones where we are on the wrong connection, or none.
 */
export const ShareGatePage = () => {
  const navigate = useNavigate();
  const { search } = useLocation();

  const activeScope = useActiveScope();
  const activeProfile = Arkitekt.useActiveProfile();
  const profiles = Arkitekt.useProfiles();
  const switchProfile = Arkitekt.useSwitchProfile();
  const connect = Arkitekt.useConnect();

  // The invitation path runs its grant HERE rather than in a dialog: this is
  // already a full page that can sit and wait for an external browser, and the
  // dialog provider renders inside `Guard.Rekuest` — which is exactly the
  // service we do not have when this branch is on screen.
  const [connecting, setConnecting] = React.useState(false);
  const [connectError, setConnectError] = React.useState<string | null>(null);

  const acceptInvitation = React.useCallback(
    async (baseUrl: string, hub: string | null, path: string) => {
      const controller = new AbortController();
      setConnectError(null);
      setConnecting(true);
      try {
        // Recorded BEFORE the grant: the switch that follows destroys this tab,
        // and the hash cannot be trusted across a membership change.
        rememberPendingShare(path);
        const endpoint = await discover({ url: baseUrl, controller, timeout: 2000 });
        await connect({
          endpoint,
          controller,
          // A link that names its hub can point the configure page at it. Never
          // a `sub`: a colleague opening this link is a different user on the
          // same deployment.
          ...(hub ? { hint: { hub } } : {}),
        });
      } catch (error) {
        setConnectError(
          error instanceof Error ? error.message : "Could not connect to this workspace.",
        );
      } finally {
        setConnecting(false);
      }
    },
    [connect],
  );

  const request = React.useMemo<ShareRequest | null>(
    () => decodeShareRequest(search),
    [search],
  );

  // Which stored profile this link belongs to. `undefined` while the opaque
  // form is still being hashed, `null` once we know there is no such profile.
  const [candidate, setCandidate] = React.useState<StoredProfile | null | undefined>(
    undefined,
  );

  const onScope = Boolean(
    request?.scope && activeScope && matchScope(request.scope, activeScope),
  );

  // The common case: already on the right connection, so the gate should never
  // have been visible. `replace` keeps it out of the back history.
  React.useEffect(() => {
    if (request && onScope) navigate(request.path, { replace: true });
  }, [request, onScope, navigate]);

  React.useEffect(() => {
    if (!request || onScope) return;
    let cancelled = false;

    const find = async () => {
      if (request.scope) {
        const match = profiles.find((p) => matchScope(request.scope!, profileScope(p)));
        if (!cancelled) setCandidate(match ?? null);
        return;
      }
      // The opaque form names no server, so the only way to recognise it is to
      // hash what we already hold and look for the same digest.
      for (const profile of profiles) {
        if (cancelled) return;
        if ((await scopeDigest(profileScope(profile))) === request.digest) {
          if (!cancelled) setCandidate(profile);
          return;
        }
      }
      if (!cancelled) setCandidate(null);
    };

    void find();
    return () => {
      cancelled = true;
    };
  }, [request, onScope, profiles]);

  // Already on the active connection's own digest? Then this is a match too,
  // and the effect above has sent us on.
  const [digestMatchesActive, setDigestMatchesActive] = React.useState(false);
  React.useEffect(() => {
    if (!request?.digest || !activeScope) return;
    let cancelled = false;
    void scopeDigest(activeScope).then((digest) => {
      if (!cancelled && digest === request.digest) setDigestMatchesActive(true);
    });
    return () => {
      cancelled = true;
    };
  }, [request, activeScope]);

  React.useEffect(() => {
    if (request && digestMatchesActive) navigate(request.path, { replace: true });
  }, [request, digestMatchesActive, navigate]);

  const confirmSwitch = React.useCallback(
    (profile: StoredProfile) => {
      // The switch re-boots the tab store and destroys this tab, so the
      // destination has to be recorded before rather than navigated to after.
      rememberPendingShare(request!.path);
      void switchProfile(profile.id);
    },
    [request, switchProfile],
  );

  // Signed into the link's server, in another organization: lok can say
  // whether this user belongs to the link's one. `undefined` while asking,
  // `null` when it could not be asked (then the gate behaves as before).
  const linkOrg = request?.scope?.org ?? null;
  const onLinkServer = Boolean(
    request?.scope && activeProfile?.identity.baseUrl === request.scope.baseUrl,
  );
  const isMemberOf = useOperation<{ member: boolean }>("lok.isMemberOf");
  const requestMembership = useOperation("lok.requestMembership");
  const [member, setMember] = React.useState<boolean | null | undefined>(undefined);
  // This page sits outside the guards, so a link that started the app gets
  // here before the session is up: wait for it rather than give up on lok.
  const connected = Boolean(Arkitekt.useConnection()?.selfService);
  const connectFailed = Boolean(Arkitekt.useAutoLoginError());
  React.useEffect(() => {
    if (candidate !== null || !onLinkServer || !linkOrg) return;
    if (!connected) {
      setMember(connectFailed ? null : undefined);
      return;
    }
    let cancelled = false;
    setMember(undefined);
    isMemberOf({ organization: linkOrg }).then(
      (answer) => !cancelled && setMember(answer.member),
      () => !cancelled && setMember(null),
    );
    return () => {
      cancelled = true;
    };
  }, [candidate, onLinkServer, linkOrg, isMemberOf, connected, connectFailed]);

  if (!request) {
    return (
      <Gate title="This link is incomplete">
        <p className="text-sm text-muted-foreground">
          It does not say which page to open. It may have been shortened or cut off
          in transit.
        </p>
      </Gate>
    );
  }

  if (onScope || digestMatchesActive) return <Gate title="Opening…" busy />;

  if (candidate === undefined) return <Gate title="Checking this link…" busy />;

  if (candidate) {
    const where = describe(candidate);
    return (
      <Gate title={`Open in ${where}?`}>
        <p className="text-sm text-muted-foreground">
          This link belongs to {where}. You are currently on{" "}
          {activeScope ? describeActive(profiles, activeScope.baseUrl) : "no workspace"}.
        </p>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => confirmSwitch(candidate)}>Switch and open</Button>
          <Button variant="ghost" onClick={() => navigate("/", { replace: true })}>
            Cancel
          </Button>
        </div>
      </Gate>
    );
  }

  // Nothing local matches. A readable link still names its deployment, so it can
  // become an invitation; a digest cannot be turned back into one.
  if (request.scope) {
    if (onLinkServer && linkOrg) {
      if (member === undefined) return <Gate title="Checking this link…" busy />;
      if (member === false) {
        return (
          <JoinGate
            requestKey={[request.scope.baseUrl, activeProfile?.identity.userId, linkOrg].join("::")}
            baseUrl={request.scope.baseUrl}
            ask={async (reason) => {
              await requestMembership({ organization: linkOrg, ...(reason ? { reason } : {}) });
            }}
            onCancel={() => navigate("/", { replace: true })}
          />
        );
      }
    }

    // Signed into that server on another profile: only from there can this
    // user ask to join. The gate itself is remembered, not the page, so it
    // looks again once the switch has landed.
    const elsewhere = onLinkServer
      ? undefined
      : profiles.find((p) => p.identity.baseUrl === request.scope!.baseUrl);

    return (
      <Gate title="You are not connected to this workspace">
        <p className="text-sm text-muted-foreground">
          This link opens a page on {request.scope.baseUrl}. Connect to it to follow
          the link — you will choose the organization in your browser.
        </p>
        {connectError && (
          <div className="flex items-start gap-2 pt-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{connectError}</span>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button
            disabled={connecting}
            onClick={() =>
              void acceptInvitation(
                request.scope!.baseUrl,
                request.scope!.hub,
                request.path,
              )
            }
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for approval in your browser…
              </>
            ) : (
              "Connect…"
            )}
          </Button>
          <Button
            variant="ghost"
            disabled={connecting}
            onClick={() => navigate("/", { replace: true })}
          >
            Cancel
          </Button>
        </div>
        {elsewhere && linkOrg && (
          <p className="pt-2 text-sm text-muted-foreground">
            Not a member of its organization?{" "}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              disabled={connecting}
              onClick={() => {
                rememberPendingShare(`/open${search}`);
                void switchProfile(elsewhere.id);
              }}
            >
              Switch to {describe(elsewhere)} to ask to join
            </button>
          </p>
        )}
      </Gate>
    );
  }

  return (
    <Gate title="You do not have access to this workspace">
      <p className="text-sm text-muted-foreground">
        This is a private link. It names its workspace only to apps that are already
        signed into it, so there is nothing here to connect to.
      </p>
    </Gate>
  );
};

const JOIN_REQUESTS_KEY = "arkitektJoinRequests";

/** When this user last asked to join, by server, user and organization. */
const readAskedAt = (key: string): string | null => {
  try {
    const asked = JSON.parse(window.localStorage.getItem(JOIN_REQUESTS_KEY) ?? "{}");
    return typeof asked[key] === "string" ? asked[key] : null;
  } catch {
    return null;
  }
};

const rememberAsked = (key: string, at: string): void => {
  try {
    const asked = JSON.parse(window.localStorage.getItem(JOIN_REQUESTS_KEY) ?? "{}");
    window.localStorage.setItem(JOIN_REQUESTS_KEY, JSON.stringify({ ...asked, [key]: at }));
  } catch {
    // Without storage the request is still sent; reopening the link just
    // shows the form again.
  }
};

/**
 * The link's organization is one this user is not part of: let them ask.
 *
 * lok never confirms that an organization exists to someone outside it, so
 * this names no organization and cannot say whether the request was seen; it
 * only remembers, on this machine, that it was sent.
 */
const JoinGate = ({
  requestKey,
  baseUrl,
  ask,
  onCancel,
}: {
  requestKey: string;
  baseUrl: string;
  ask: (reason: string) => Promise<void>;
  onCancel: () => void;
}) => {
  const [askedAt, setAskedAt] = React.useState(() => readAskedAt(requestKey));
  const [reason, setReason] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const send = async () => {
    setError(null);
    setSending(true);
    try {
      await ask(reason.trim());
      const at = new Date().toISOString();
      rememberAsked(requestKey, at);
      setAskedAt(at);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the request.");
    } finally {
      setSending(false);
    }
  };

  if (askedAt) {
    return (
      <Gate title="Request sent">
        <p className="text-sm text-muted-foreground">
          You asked to join this organization on {new Date(askedAt).toLocaleDateString()}. Its
          administrators decide; open this link again once they have added you.
        </p>
        <div className="flex gap-2 pt-2">
          <Button onClick={onCancel}>Done</Button>
          <Button variant="ghost" onClick={() => setAskedAt(null)}>
            Ask again
          </Button>
        </div>
      </Gate>
    );
  }

  return (
    <Gate title="You are not a member of this organization">
      <p className="text-sm text-muted-foreground">
        This link opens a page of an organization on {baseUrl} that you are not part of. You can
        ask to be part of it; its administrators decide.
      </p>
      <Textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={2000}
        placeholder="A note for the administrators (optional)"
        disabled={sending}
      />
      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Button disabled={sending} onClick={() => void send()}>
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          Ask to join
        </Button>
        <Button variant="ghost" disabled={sending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Gate>
  );
};

/** How to name a profile in the prompt: the organization, then the deployment. */
const describe = (profile: StoredProfile): string => {
  const org = profile.label.organizationName ?? profile.label.organizationSlug;
  const where = profile.label.deploymentName ?? profile.label.endpointName;
  if (org && where) return `${org} @ ${where}`;
  return org ?? where ?? profile.identity.baseUrl;
};

const describeActive = (profiles: StoredProfile[], baseUrl: string): string => {
  const active = profiles.find((p) => p.identity.baseUrl === baseUrl);
  return active ? describe(active) : baseUrl;
};

const Gate = ({
  title,
  busy,
  children,
}: {
  title: string;
  busy?: boolean;
  children?: React.ReactNode;
}) => (
  <div className="flex h-full w-full items-center justify-center px-4">
    <div className="flex max-w-md flex-col space-y-3">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {title}
      </h1>
      {children}
    </div>
  </div>
);

export default ShareGatePage;
