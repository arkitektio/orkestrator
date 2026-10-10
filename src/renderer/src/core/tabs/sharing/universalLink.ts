import { encodeOpaqueScope, encodeShareScope, scopeDigest, type ShareScope } from "@/core/tabs/sharing/shareScope";

/**
 * A link to a page in this app that works from anywhere.
 *
 * `arkitekt.live/deeplink` hands the path back to whichever Orkestrator is
 * installed (the `orkestrator://` handler → `tabs:open`), and shows a landing
 * page when none is — so the same URL can go in a chat, a paper, or an email.
 *
 * There are two kinds of link here, and the difference matters.
 *
 * A PORTABLE link is app-relative and names a thing any deployment can act on:
 * a GitHub repository to install. Which Kabinet installs it is the receiving
 * app's own business, and its README badge has to work for a stranger.
 *
 * A SCOPED link names an object that exists on exactly one deployment. `5` in
 * `/mikro/images/5` is not a global name — it means one image inside one
 * ServiceInstance, in one organization, on one coord server. Handing that path
 * to someone on another deployment does not fail; it quietly opens a different
 * image. So a scoped link carries the scope and the receiving app refuses to
 * guess: see `lib/shareScope.ts` and the `/open` gate.
 */
export const UNIVERSAL_LINK_BASE = "https://arkitekt.live/deeplink";

/** The wrapper: one app path, encoded as the single parameter the site reads. */
const wrap = (path: string): string =>
  `${UNIVERSAL_LINK_BASE}?orkestrator=${encodeURIComponent(path)}`;

/**
 * A portable link to a page: no scope, valid on any deployment.
 *
 * Use `scopedLinkFor` for anything naming an object by id.
 */
export const universalLinkFor = (location: { pathname: string; search?: string }): string =>
  wrap(`${location.pathname}${location.search ?? ""}`);

/**
 * A link to a page as it exists on ONE deployment.
 *
 * The scope rides inside the encoded path as the `/open` gate's own query, so
 * the site needs no new parameter and the target page's query cannot collide
 * with it.
 */
export const scopedLinkFor = (
  location: { pathname: string; search?: string },
  scope: ShareScope,
): string => wrap(encodeShareScope(scope, `${location.pathname}${location.search ?? ""}`));

/**
 * The same link with the scope reduced to a digest, for pasting in public.
 *
 * The readable form spells out a hostname and an organization; this one names
 * neither. It can still be recognised by an app that already holds the profile,
 * and cannot be turned into an invitation by anyone who does not.
 */
export const privateLinkFor = async (
  location: { pathname: string; search?: string },
  scope: ShareScope,
): Promise<string> =>
  wrap(
    encodeOpaqueScope(
      await scopeDigest(scope),
      `${location.pathname}${location.search ?? ""}`,
    ),
  );

/**
 * Where an organization's links are served: kontrol, the deployment's own
 * front door (`frontend_url` in lok's `/.well-known/fakts`). It walks whoever
 * opens one through signing in, joining the organization and installing the
 * app before it hands the link to `orkestrator://`; the raw scheme does none
 * of that, so only these https forms are ever copied. An organization without
 * a slug cannot be linked this way.
 */
export type LinkHost = {
  frontendUrl: string;
  /** The organization's slug. */
  slug: string;
  /** lok's id of the hub. */
  hub: string;
  /** lok's id of whoever copies the link; kontrol shows them as the sharer. */
  user?: string | null;
};

/** The query parameter that names the sharer. For kontrol's page only: the app drops it. */
export const SHARER_PARAM = "user_id";

const origin = (host: LinkHost) => host.frontendUrl.replace(/\/+$/, "");

const withSharer = (link: string, host: LinkHost): string =>
  host.user ? `${link}${link.includes("?") ? "&" : "?"}${SHARER_PARAM}=${encodeURIComponent(host.user)}` : link;

/**
 * A link to one object, named by identifier and id rather than by this app's
 * route to it (`<frontend>/smartlink/<org>/<hub>/<identifier>/<id>`). The
 * identifier is one encoded segment. Arrives back as `/smart/…`
 * (`core/links/SmartLinkPage`).
 */
export const smartLinkFor = (host: LinkHost, structure: { identifier: string; id: string }): string =>
  withSharer(
    [origin(host), "smartlink", ...[host.slug, host.hub, structure.identifier, structure.id].map(encodeURIComponent)].join("/"),
    host,
  );

/**
 * A link to a page of this app inside one organization
 * (`<frontend>/deeplink/<org>/orkestrator/<path>`). Kontrol hands the path
 * over as written and without the organization, so the path is the `/open`
 * gate's: the scope rides in it and this app checks it on arrival.
 */
export const orgLinkFor = (
  host: LinkHost,
  location: { pathname: string; search?: string },
  scope: ShareScope,
): string =>
  withSharer(
    `${origin(host)}/deeplink/${encodeURIComponent(host.slug)}/orkestrator/${encodeShareScope(
      scope,
      `${location.pathname}${location.search ?? ""}`,
    ).replace(/^\/+/, "")}`,
    host,
  );

/**
 * The "Open in Arkitekt" badge, as served by the site.
 *
 * One generic image for every link — what a badge points at is the link's
 * business, not the picture's — so a README, a paper or a wiki can show the
 * same mark whatever page it opens.
 */
export const BADGE_IMAGE_URL = "https://arkitekt.live/img/badge/open-in-arkitekt.svg";

/** The markdown to paste in a README: the badge, linking to a page here. */
export const badgeMarkdownFor = (location: { pathname: string; search?: string }): string =>
  `[![Open in Arkitekt](${BADGE_IMAGE_URL})](${universalLinkFor(location)})`;

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
