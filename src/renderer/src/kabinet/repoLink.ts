import { badgeMarkdownFor, universalLinkFor } from "@/core/tabs/sharing/universalLink";

/**
 * A GitHub repository as Kabinet names it: owner + repository.
 */
export type GithubCoordinates = { user: string; repo: string };

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

/** Where the install prompt lives, inside the app. */
export const INSTALL_REPO_PATH = "/kabinet/repos/install";

/** The install prompt for one repository, as a router location. */
const installLocation = (coordinates: GithubCoordinates) => ({
  pathname: INSTALL_REPO_PATH,
  search: `?repo=${encodeURIComponent(githubIdentifier(coordinates))}`,
});

/**
 * The app-relative location of the install prompt for one repository.
 */
export const installRepoPath = (coordinates: GithubCoordinates): string => {
  const { pathname, search } = installLocation(coordinates);
  return `${pathname}${search}`;
};

/**
 * The link to hand someone else: it opens their Orkestrator on the install
 * prompt for this repository, and the arkitekt.live landing page when they have
 * none. Which Kabinet the repo is added to is the receiving app's business —
 * the link only says which repository.
 */
export const installRepoLink = (coordinates: GithubCoordinates): string =>
  universalLinkFor(installLocation(coordinates));

/**
 * The same link as a README badge, which is how an app repo advertises itself:
 * the generic "Open in Arkitekt" image over this repository's install link.
 */
export const installBadgeMarkdown = (coordinates: GithubCoordinates): string =>
  badgeMarkdownFor(installLocation(coordinates));
