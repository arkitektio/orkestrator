import { useDialog } from "@/core/dialogs/registry";
import { openInBrowser } from "@/core/util/openInBrowser";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAttachmentUrls, useDatalayerOrigin } from "../datalayer/attachments";
import { parseRecipients } from "../format";
import { buildSrcDoc, cidReferences, rewriteCidImages } from "../html";

/**
 * A mail's HTML in a sandboxed iframe. The sandbox allows no scripts, only
 * same-origin, so the page can size the frame to its content and catch link
 * clicks: web links open in the system browser, `mailto:` opens a new mail
 * from `account`. The frame never navigates.
 */
export const HtmlBody = ({
  message,
  html,
  allowRemote,
  account,
}: {
  message: string;
  html: string;
  allowRemote: boolean;
  account?: string;
}) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(120);
  const { openSheet } = useDialog();

  const cids = useMemo(() => cidReferences(html), [html]);
  const urls = useAttachmentUrls(message, cids.length > 0);
  const origin = useDatalayerOrigin();
  const srcDoc = useMemo(
    () => buildSrcDoc(rewriteCidImages(html, urls.byCid), { allowRemote, imageOrigins: origin ? [origin] : [] }),
    [html, urls, allowRemote, origin],
  );

  // Re-bound on every document the frame loads (each srcDoc change).
  const [loaded, setLoaded] = useState(0);
  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.body) return;

    const measure = () => setHeight(Math.max(40, doc.documentElement.scrollHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(doc.body);
    // Images change the height once they arrive.
    doc.querySelectorAll("img").forEach((img) => img.addEventListener("load", measure));

    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!link) return;
      event.preventDefault();
      const href = link.getAttribute("href") ?? "";
      if (/^https?:/i.test(href)) openInBrowser(href);
      else if (/^mailto:/i.test(href)) {
        const [to, query = ""] = href.slice("mailto:".length).split("?");
        const params = new URLSearchParams(query);
        openSheet(
          "kuvertcompose",
          {
            account,
            to: parseRecipients(decodeURIComponent(to)).recipients.map((r) => r.address),
            subject: params.get("subject") ?? undefined,
            body: params.get("body") ?? undefined,
          },
          { size: "large" },
        );
      }
    };
    doc.addEventListener("click", onClick);
    return () => {
      observer.disconnect();
      doc.removeEventListener("click", onClick);
    };
  }, [loaded, account, openSheet]);

  return (
    <iframe
      ref={frame}
      title="Message"
      sandbox="allow-same-origin"
      srcDoc={srcDoc}
      onLoad={() => setLoaded((n) => n + 1)}
      style={{ height }}
      className="w-full rounded-lg bg-white"
    />
  );
};

/** The plain-text body, for a mail without HTML. */
export const TextBody = ({ text }: { text: string }) => (
  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{text}</div>
);
