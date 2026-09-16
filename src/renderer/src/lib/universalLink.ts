/**
 * A link to a page in this app that works from anywhere.
 *
 * `arkitekt.live/deeplink` hands the path back to whichever Orkestrator is
 * installed (the `orkestrator://` handler → `tabs:open`), and shows a landing
 * page when none is — so the same URL can go in a chat, a paper, or an email.
 * The path is app-relative (`/mikro/arraydatasets/5?sidebar=false`): which
 * server it belongs to is the receiving app's own business.
 */
export const UNIVERSAL_LINK_BASE = "https://arkitekt.live/deeplink";

export const universalLinkFor = (location: { pathname: string; search?: string }): string =>
  `${UNIVERSAL_LINK_BASE}?orkestrator=${encodeURIComponent(`${location.pathname}${location.search ?? ""}`)}`;

/**
 * Put text on the clipboard, by whichever route this build has.
 *
 * The modern API first; the Electron bridge when that is refused (a page
 * without focus, say); and, in a browser build without either, the old
 * `execCommand` trick. Resolves `true` only when one of them worked.
 */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the bridge
  }
  const api = (window as { api?: { copyToClipboard?: (t: string) => unknown } }).api;
  if (api?.copyToClipboard) {
    api.copyToClipboard(text);
    return true;
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};
