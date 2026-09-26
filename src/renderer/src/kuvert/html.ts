/**
 * The HTML body of a mail, made ready for a sandboxed `<iframe srcdoc>`.
 *
 * The server already sanitized it (no scripts, styles, handlers or forms;
 * remote images removed unless asked for). What is left for the client:
 * point `cid:` images at their attachment, and wrap the fragment in a
 * document whose CSP only lets images load from where we allow.
 */

const CID = /(\bsrc\s*=\s*["']?|url\(\s*["']?)cid:([^"'\s)>]+)/gi;

/** The Content-ID as the attachment stores it: no angle brackets, URL-decoded. */
const normalizeCid = (cid: string) => {
  let id = cid.trim().replace(/^<|>$/g, "");
  try {
    id = decodeURIComponent(id);
  } catch {
    // Keep it as it is.
  }
  return id.toLowerCase();
};

/** The `cid:` references the HTML makes, normalized. */
export const cidReferences = (html: string) => {
  const found = new Set<string>();
  for (const match of html.matchAll(CID)) found.add(normalizeCid(match[2]));
  return [...found];
};

/**
 * Replace each `cid:` image with the URL of its attachment (`urls` keyed by
 * Content-ID, any case, with or without brackets). One without a URL yet is
 * left as it is: it shows as a broken image until its URL arrives.
 */
export const rewriteCidImages = (html: string, urls: ReadonlyMap<string, string>) => {
  if (urls.size === 0) return html;
  const byId = new Map([...urls].map(([cid, url]) => [normalizeCid(cid), url]));
  return html.replace(CID, (whole, prefix: string, cid: string) => {
    const url = byId.get(normalizeCid(cid));
    return url ? `${prefix}${url}` : whole;
  });
};

const escapeAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/**
 * The whole document for the iframe. No scripts at all (`script-src 'none'`
 * on top of the sandbox); images only from `data:`/`blob:`, the datalayer
 * (`imageOrigins`, for inline attachments) and, with `allowRemote`, anywhere.
 * Mail is written for a white page, so it gets one whatever the app theme is.
 */
export const buildSrcDoc = (
  html: string,
  { allowRemote = false, imageOrigins = [] }: { allowRemote?: boolean; imageOrigins?: string[] } = {},
) => {
  const img = ["data:", "blob:", ...imageOrigins, ...(allowRemote ? ["https:", "http:"] : [])].join(" ");
  const csp = `default-src 'none'; script-src 'none'; img-src ${img}; style-src 'unsafe-inline'; font-src data:; media-src 'none'; frame-src 'none'`;
  return (
    "<!doctype html><html><head>" +
    '<meta charset="utf-8">' +
    `<meta http-equiv="Content-Security-Policy" content="${escapeAttr(csp)}">` +
    '<meta name="color-scheme" content="light">' +
    '<base target="_blank">' +
    "<style>" +
    "html,body{margin:0;padding:0;background:#fff;color:#111;}" +
    "body{padding:12px 16px;font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow-wrap:anywhere;}" +
    "img{max-width:100%;height:auto;}" +
    "table{max-width:100%;}" +
    "pre{white-space:pre-wrap;}" +
    "blockquote{margin:0 0 0 .5em;padding-left:.75em;border-left:2px solid #ccc;color:#555;}" +
    "</style></head><body>" +
    html +
    "</body></html>"
  );
};
