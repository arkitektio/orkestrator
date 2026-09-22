/**
 * Where the Tailscale command line tool lives, per platform.
 *
 * A FIXED list, checked with an injected `exists` predicate. There is no PATH
 * search and no `which`, because the whole point of the surrounding module is
 * that nothing dynamic ever reaches an argv — the binary we execute must be a
 * path we wrote down here ourselves.
 *
 * An absent CLI is a normal outcome, not an error: Tailscale installed from
 * the Mac App Store is sandboxed and ships no command line tool at all.
 */

export const TAILSCALE_CANDIDATES: Record<string, readonly string[]> = {
  darwin: [
    "/usr/local/bin/tailscale",
    "/opt/homebrew/bin/tailscale",
    "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
  ],
  linux: ["/usr/bin/tailscale", "/usr/local/bin/tailscale", "/snap/bin/tailscale"],
  win32: [
    "C:\\Program Files\\Tailscale\\tailscale.exe",
    "C:\\Program Files (x86)\\Tailscale\\tailscale.exe",
  ],
};

/** The GUI, for the platforms where we can offer to open it instead. */
export const TAILSCALE_APP_PATHS: Record<string, string | undefined> = {
  darwin: "/Applications/Tailscale.app",
  win32: undefined,
  linux: undefined,
};

export const tailscaleCandidates = (platform: string): readonly string[] =>
  TAILSCALE_CANDIDATES[platform] ?? [];

export const locateTailscale = async (
  platform: string,
  exists: (path: string) => Promise<boolean>,
): Promise<string | undefined> => {
  for (const candidate of tailscaleCandidates(platform)) {
    if (await exists(candidate)) return candidate;
  }
  return undefined;
};

export const isSupportedPlatform = (platform: string): boolean =>
  tailscaleCandidates(platform).length > 0;
