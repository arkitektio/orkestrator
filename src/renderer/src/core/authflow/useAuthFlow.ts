import { Arkitekt } from "@/core/connection/arkitekt/host";
import { resolveServiceClient } from "@/core/modules/host/operations";
import { MODULE_AUTH_FLOWS } from "@/core/modules/registries";
import { openInBrowser } from "@/core/util/openInBrowser";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { forgetPending, rememberPending } from "./pending";
import type { AuthSession } from "./types";
import { AuthDriver, useAuthSession } from "./useAuthSession";

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong";

/**
 * One login through `flow`'s module (its `authFlow` builtin), from a dialog:
 * `begin` obtains the session with `open` (the module's own start or resume
 * mutation), remembers it for the callback page and sends the user to the
 * provider. `onDone` fires once, when the login is DONE, however it got there.
 */
export const useAuthFlow = ({
  flow,
  open,
  onDone,
}: {
  flow: string;
  open: () => Promise<AuthSession | null | undefined>;
  onDone?: (session: AuthSession) => void;
}) => {
  const store = Arkitekt.useStoreApi();
  const profile = Arkitekt.useActiveProfileId();

  const driver = useMemo((): AuthDriver => {
    const handler = () => {
      const found = MODULE_AUTH_FLOWS[flow];
      if (!found) throw new Error(`No module handles ${flow} logins`);
      return found;
    };
    const client = () => {
      const found = resolveServiceClient(store.getState(), handler().service);
      if (!found) throw new Error(`${handler().service} is not available`);
      return found;
    };
    return {
      complete: async (input) => handler().complete(client(), input),
      read: async (session) => handler().read?.(client(), session) ?? null,
      cancel: async (session) => handler().cancel?.(client(), session),
    };
  }, [flow, store]);

  const auth = useAuthSession({ open, driver });

  const start = auth.begin;
  const begin = useCallback(async () => {
    const session = await start();
    if (!session) return null;
    rememberPending(session.state, {
      namespace: flow,
      profile,
      expiresAt: new Date(session.expiresAt).getTime(),
    });
    openInBrowser(session.openUrl);
    return session;
  }, [start, flow, profile]);

  const done = useRef<string | null>(null);
  const finished = useRef(onDone);
  finished.current = onDone;
  const session = auth.session;
  const kind = auth.phase?.kind;
  useEffect(() => {
    if (!session || !kind || kind === "approve" || kind === "step") return;
    forgetPending(session.state);
    if (kind !== "done" || done.current === session.state) return;
    done.current = session.state;
    finished.current?.(session);
  }, [session, kind]);

  return {
    ...auth,
    begin,
    reopen: () => session && openInBrowser(session.openUrl),
    /** The last failed request, in the module's words. */
    problem: auth.error ? (MODULE_AUTH_FLOWS[flow]?.describeError?.(auth.error) ?? messageOf(auth.error)) : null,
  };
};

export type AuthFlowState = ReturnType<typeof useAuthFlow>;
