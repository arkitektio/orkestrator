import { intentPath } from "@/core/links/intents";
import { badgeMarkdownFor, universalLinkFor } from "@/core/tabs/sharing/universalLink";

/**
 * A GitHub repository as Kabinet names it: owner + repository, and the branch
 * it reads app manifests from (Kabinet's default, `main`, when left out).
 * Only the legacy install route (`?repo=user/repo`) still reads one from a
 * link: published links install the app's package (`oci:`), never its source.
 */
export type GithubCoordinates = { user: string; repo: string; branch?: string };

/**
 * Read `user/repo` out of whatever a person pastes.
 *
 * Kabinet's `createGithubRepo(identifier:)` wants exactly `user/repo`, but what
 * lands in the field (or in a shared link) is usually a browser URL, sometimes
 * a clone URL, occasionally with a `/tree/<branch>` tail. All of those name the
 * same repository, so all of them are accepted and reduced to the same pair.
 * Anything else is `null` — the caller decides whether that is a form error or
 * a broken link.
 */
export const parseGithubIdentifier = (input: string): GithubCoordinates | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // `git@github.com:user/repo.git` and `https://github.com/user/repo/tree/main`
  // both reduce to the path after the host.
  const withoutScheme = trimmed
    .replace(/^[a-z+]+:\/\//i, "")
    .replace(/^git@github\.com:/i, "github.com/")
    .replace(/^(www\.)?github\.com\//i, "");

  const [user, repo] = withoutScheme.replace(/^\/+/, "").split("/");
  if (!user || !repo) return null;

  const cleanRepo = repo.replace(/\.git$/i, "");
  if (!isSegment(user) || !isSegment(cleanRepo)) return null;

  return { user, repo: cleanRepo };
};

// GitHub's own rule for owners and repository names, near enough: letters,
// digits and `-._`, nothing that would need escaping in a path.
const isSegment = (value: string) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);

export const githubIdentifier = ({ user, repo }: GithubCoordinates): string => `${user}/${repo}`;

/**
 * Whether `value` can be a git branch: what `git check-ref-format --branch`
 * allows, near enough, and nothing that would split Kabinet's
 * `user/repo:branch` identifier.
 */
export const isBranchName = (value: string): boolean =>
  value.length > 0 &&
  value.length <= 255 &&
  /^[A-Za-z0-9._/-]+$/.test(value) &&
  !value.startsWith("-") &&
  !value.startsWith("/") &&
  !value.endsWith("/") &&
  !value.endsWith(".") &&
  !value.endsWith(".lock") &&
  !value.includes("..") &&
  !value.includes("//");

/**
 * What `createGithubRepo(identifier:)` reads: `user/repo`, or
 * `user/repo:branch` (Kabinet ignores its separate `branch` field whenever an
 * identifier is given).
 */
export const kabinetIdentifier = (coordinates: GithubCoordinates): string =>
  coordinates.branch ? `${githubIdentifier(coordinates)}:${coordinates.branch}` : githubIdentifier(coordinates);

/** Where the install prompt lives, inside the app. Free to move: links name the intent. */
export const INSTALL_REPO_PATH = "/kabinet/repos/install";

/**
 * The intent links name (`core/links/intents.ts`). A published promise: README
 * badges carry it, so it is read forever, whatever the route above becomes.
 */
export const REPO_INSTALL_INTENT = "repo.install";

/** A registry host, as docker tells one from a repository's first path segment. */
const isRegistryHost = (segment: string) => segment.includes(".") || segment.includes(":") || segment === "localhost";

/** One segment of a repository path, as the OCI distribution spec allows it. */
const isPathSegment = (segment: string) => /^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$/.test(segment);

/**
 * The OCI repository `input` names (`ghcr.io/owner/app`), normalized, or `null`.
 *
 * Mirrors kabinet's own `parse_reference` (`bridge/repo/oci.py`): the
 * repository alone, never a tag or a digest. Lowercased, because a repository
 * path is lowercase and a GitHub owner's name need not be (the release
 * workflow lowercases it the same way); the server checks again.
 */
export const parseOciReference = (input: string): string | null => {
  const reference = input
    .trim()
    .replace(/^oci:\/\//i, "")
    .replace(/^https:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
  if (!reference || reference.length > 255 || !/^[a-z0-9._:/-]+$/.test(reference)) return null;
  const segments = reference.split("/");
  const [head, ...rest] = segments;
  const path = rest.length > 0 && isRegistryHost(head) ? rest : segments;
  // A `:` past the host is a tag.
  if (!path.every(isPathSegment)) return null;
  return reference;
};

/** The prompt for one package, as an app path (where the intent lands). */
export const installRepoPath = (reference: string): string =>
  `${INSTALL_REPO_PATH}?${new URLSearchParams({ reference })}`;

/**
 * The intent link for one package: `/do/v1/repo.install?source=oci:<reference>`.
 * The arkitekt SDK builds the same string (`arkitekt plugin badge`); the badge
 * test on both sides pins it.
 */
export const installRepoIntentPath = (reference: string): string =>
  intentPath(REPO_INSTALL_INTENT, { source: `oci:${reference}` });

const intentLocation = (reference: string) => {
  const path = installRepoIntentPath(reference);
  const at = path.indexOf("?");
  return { pathname: path.slice(0, at), search: path.slice(at) };
};

/**
 * The link to hand someone else: it opens their Orkestrator on the install
 * prompt for this package, and the arkitekt.live landing page when they have
 * none. Which organization's Kabinet imports it is asked on arrival
 * (`IntentPage`); the link only says which package.
 */
export const installRepoLink = (reference: string): string => universalLinkFor(intentLocation(reference));

/**
 * The same link as a README badge, which is how an app advertises itself:
 * the generic "Open in Arkitekt" image over its install link.
 */
export const installBadgeMarkdown = (reference: string): string => badgeMarkdownFor(intentLocation(reference));
