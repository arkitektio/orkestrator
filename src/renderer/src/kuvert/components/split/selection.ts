import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export type MailSelection = { kind: "thread" | "message"; id: string } | null;

/**
 * What the reading pane shows: `?thread=<id>` or `?message=<id>` on the
 * current page, so a selection survives reloads, back/forward and links.
 * Other query params (the page's own, the sidebars') are kept.
 */
export const useMailSelection = () => {
  const [params, setParams] = useSearchParams();
  const thread = params.get("thread");
  const message = params.get("message");
  const selected: MailSelection = thread ? { kind: "thread", id: thread } : message ? { kind: "message", id: message } : null;

  const select = useCallback(
    (next: MailSelection, replace = true) =>
      setParams(
        (current) => {
          const out = new URLSearchParams(current);
          out.delete("thread");
          out.delete("message");
          if (next) out.set(next.kind, next.id);
          return out;
        },
        { replace },
      ),
    [setParams],
  );

  return { selected, select };
};
