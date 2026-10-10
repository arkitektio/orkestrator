import { Arkitekt } from "@/core/connection/arkitekt/host";
import { useDialog } from "@/core/dialogs/registry";
import { BackButton, HomeButton } from "@/core/layout/fallbacks/statusActions";
import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { useModuleHostVersion } from "@/core/modules/host/host";
import { resolveServiceClient } from "@/core/modules/host/operations";
import { MODULE_AUTH_FLOWS } from "@/core/modules/registries";
import { smartRegistry } from "@/core/smart/registry";
import { Button } from "@/core/ui/button";
import { Check, KeyRound, Loader2, ShieldQuestion, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useStore } from "zustand";
import { announceAuthUpdate } from "./announce";
import { findPending, forgetPending } from "./pending";
import { redirectError } from "./redirect";
import type { AuthResult } from "./types";

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong";

const pathOf = (result: AuthResult) => {
  const path = smartRegistry.getModelPath(result.identifier);
  return path ? `/${path.replace(/^\/+/, "")}/${encodeURIComponent(result.id)}` : null;
};

type Outcome = { kind: "working" } | { kind: "done"; label?: string | null } | { kind: "failed"; text: string };

/**
 * Where a REDIRECT login comes back, for every module
 * (`/auth/callback/:namespace`). The provider sends the browser to the public
 * relay, which opens `orkestrator://auth/callback/<namespace>?code&state`:
 * this page, in a tab. It finishes the login with the module's `authFlow`
 * handler, tells a dialog still waiting on the same `state`, and moves on to
 * what was linked.
 *
 * Outside the module's guards on purpose (like `/open`): it has to say why a
 * login cannot be finished here (other profile, service down), not render
 * nothing. A redirect this device did not start is refused, since any web
 * page or local app can open an `orkestrator://` link.
 */
export const AuthCallbackPage = () => {
  useModuleHostVersion();
  const { namespace = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { openDialog } = useDialog();
  const code = params.get("code");
  const state = params.get("state");
  const refusal = redirectError(params);

  const handler = MODULE_AUTH_FLOWS[namespace];
  const store = Arkitekt.useStoreApi();
  const client = useStore(store, (s) => (handler ? resolveServiceClient(s, handler.service) : undefined));
  const activeProfile = Arkitekt.useActiveProfileId();
  const profiles = Arkitekt.useProfiles();

  const pending = state ? findPending(state) : null;
  const elsewhere = pending?.profile && pending.profile !== activeProfile ? pending.profile : null;
  // Any local app can open an `orkestrator://` link: only a login this device
  // started is ever exchanged.
  const [trusted] = useState(!!pending);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "working" });
  const ran = useRef(false);

  const ready = !!handler && !!client && !!code && !!state && !refusal && !elsewhere && trusted;

  // The provider said no: the server records it, so the login ends as FAILED
  // everywhere. Only for a login this profile started; nobody clicks through
  // a refusal.
  const refused = !!handler && !!client && !!state && !!refusal && !!pending && !elsewhere;

  useEffect(() => {
    if (!state || !refusal || ran.current) return;
    if (pending && !elsewhere && handler && !client) return;
    ran.current = true;
    forgetPending(state);
    const local = { status: "FAILED" as const, errorMessage: `The provider stopped the login: ${refusal}` };
    if (!refused) {
      announceAuthUpdate(state, local);
      return;
    }
    handler
      .complete(client, {
        state,
        error: params.get("error") ?? "access_denied",
        errorDescription: params.get("error_description") ?? undefined,
      })
      .then((update) => announceAuthUpdate(state, update.status === "PENDING" ? local : update))
      .catch(() => announceAuthUpdate(state, local));
  }, [state, refusal, refused, client]);

  useEffect(() => {
    if (!ready || ran.current) return;
    ran.current = true;
    handler
      .complete(client, { state, code })
      .then((update) => {
        announceAuthUpdate(state, update);
        if (update.status !== "DONE") {
          setOutcome({ kind: "failed", text: update.errorMessage || "The login was not finished." });
          return;
        }
        forgetPending(state);
        setOutcome({ kind: "done", label: update.result?.label });
        const path = update.result && pathOf(update.result);
        if (path) navigate(path, { replace: true });
      })
      .catch((e) => setOutcome({ kind: "failed", text: handler.describeError?.(e) ?? messageOf(e) }));
  }, [ready]);

  const title = handler?.title ?? "Login";
  const leave = (
    <>
      {handler?.restartDialog && (
        // The id is the module's own; the registry's types cannot know it here.
        <Button onClick={() => (openDialog as (id: string, props: object, options?: object) => void)(handler.restartDialog!, {}, { size: "medium" })}>
          Start again
        </Button>
      )}
      <BackButton />
      <HomeButton />
    </>
  );

  if (!handler) {
    return (
      <StatusPage
        icon={TriangleAlert}
        tone="warning"
        eyebrow="Login"
        title="Nothing here handles this login"
        description={`No installed module finishes logins for “${namespace}”.`}
        actions={leave}
      />
    );
  }
  if (refusal) {
    return (
      <StatusPage
        icon={TriangleAlert}
        tone="warning"
        eyebrow={title}
        title="The provider stopped the login"
        description={refusal}
        actions={leave}
      />
    );
  }
  if (!code || !state) {
    return (
      <StatusPage
        icon={TriangleAlert}
        tone="warning"
        eyebrow={title}
        title="This link has no login code in it"
        description="It should carry the code and state the provider sent back. Start the login again."
        actions={leave}
      />
    );
  }
  if (elsewhere) {
    const profile = profiles.find((p) => p.id === elsewhere);
    return (
      <StatusPage
        icon={ShieldQuestion}
        tone="warning"
        eyebrow={title}
        title="This login was started in another profile"
        description={
          profile
            ? `Switch to ${profile.label.organizationName ?? profile.identity.baseUrl} and open the link again, or paste the address the browser ended up on into the dialog there.`
            : "Switch to the profile it was started in and open the link again."
        }
        actions={leave}
      />
    );
  }
  if (!trusted) {
    return (
      <StatusPage
        icon={ShieldQuestion}
        tone="warning"
        eyebrow={title}
        title="This login was not started here"
        description="Only a login started on this device is finished from a link. If you just signed in at the provider, paste the address the browser ended up on into the dialog that started it."
        actions={leave}
      />
    );
  }
  if (!client) {
    return (
      <StatusPage
        icon={Loader2}
        spin
        busy
        eyebrow={title}
        title={`Waiting for ${handler.service}`}
        description="The login is finished as soon as the service is reachable."
        actions={leave}
      />
    );
  }
  if (outcome.kind === "failed") {
    return (
      <StatusPage
        icon={TriangleAlert}
        tone="destructive"
        eyebrow={title}
        title="The login could not be finished"
        description={outcome.text}
        actions={leave}
      />
    );
  }
  if (outcome.kind === "done") {
    return (
      <StatusPage
        icon={Check}
        eyebrow={title}
        title={outcome.label ? `${outcome.label} linked` : "Linked"}
        actions={<HomeButton />}
      />
    );
  }
  return <StatusPage icon={KeyRound} busy eyebrow={title} title="Finishing the login…" />;
};

export default AuthCallbackPage;
