import { copyText, universalLinkFor } from "@/lib/universalLink";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * "Share this page": put its universal link on the clipboard.
 *
 * Takes the location rather than reading the router, so the chrome (which sees
 * the ACTIVE tab through `useActiveTabNavigation`) and a page (which sees its
 * own router) both use it. `copied` flips true for a moment afterwards, for the
 * button to show a check.
 */
export const useCopyUniversalLink = (location: { pathname: string; search?: string }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const { pathname, search } = location;
  const copy = useCallback(async () => {
    const link = universalLinkFor({ pathname, search });
    const ok = await copyText(link);
    if (!ok) {
      toast.error("Could not copy the link");
      return;
    }
    setCopied(true);
    toast.success("Link copied", { description: link });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  }, [pathname, search]);

  return { copy, copied };
};
