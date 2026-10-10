import { useActiveLinkHost, useActiveScope } from "@/core/tabs/sharing/use-active-scope";
import {
  badgeMarkdownFor,
  copyText,
  orgLinkFor,
  privateLinkFor,
  scopedLinkFor,
  universalLinkFor,
} from "@/core/tabs/sharing/universalLink";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/core/notify";

/**
 * "Share this page": put its universal link on the clipboard.
 *
 * Takes the location rather than reading the router, so the chrome (which sees
 * the ACTIVE tab through `useActiveTabNavigation`) and a page (which sees its
 * own router) both use it. `copied` flips true for a moment afterwards, for the
 * button to show a check.
 *
 * `copyBadge` puts the same link on the clipboard dressed as the "Open in
 * Arkitekt" README badge — the markdown, not the URL. It shares the `copied`
 * flash because to the button they are one action in two forms.
 *
 * `copy` is SCOPED while there is a connection to scope it to: a page here
 * shows one deployment's objects, and the same path elsewhere would open
 * different ones. It is served by the organization's own front door
 * (`orgLinkFor`) when the deployment has one, by arkitekt.live otherwise. `copyPrivate` is the same link with the deployment and
 * organization hashed away, for pasting somewhere public. The badge stays
 * portable, because a README is read by strangers.
 */
export const useCopyUniversalLink = (location: { pathname: string; search?: string }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const { pathname, search } = location;
  const put = useCallback(async (text: string, message: string) => {
    const ok = await copyText(text);
    if (!ok) {
      toast.error("Could not copy the link");
      return;
    }
    setCopied(true);
    toast.success(message, { description: text });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  }, []);

  const scope = useActiveScope();
  const host = useActiveLinkHost();

  const copy = useCallback(
    () =>
      put(
        scope
          ? host
            ? orgLinkFor(host, { pathname, search }, scope)
            : scopedLinkFor({ pathname, search }, scope)
          : universalLinkFor({ pathname, search }),
        "Link copied",
      ),
    [pathname, search, scope, host, put],
  );

  const copyPrivate = useCallback(async () => {
    if (!scope) {
      toast.error("Connect to a workspace before copying a private link");
      return;
    }
    put(await privateLinkFor({ pathname, search }, scope), "Private link copied");
  }, [pathname, search, scope, put]);

  const copyBadge = useCallback(
    () => put(badgeMarkdownFor({ pathname, search }), "Badge copied"),
    [pathname, search, put],
  );

  return { copy, copyPrivate, copyBadge, copied };
};
