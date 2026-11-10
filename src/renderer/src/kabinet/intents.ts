import type { IntentDecl, IntentParse } from "@/core/links/intents";
import { installRepoPath, parseOciReference, REPO_INSTALL_INTENT } from "./repoLink";

/**
 * Read `repo.install` v1: `source=oci:<registry>/<repository>`, the package an
 * app's release workflow publishes (`ghcr.io/owner/app`). That is what a
 * badge installs, never the app's source: what Kabinet runs is the released
 * package, and an SDK-made project keeps no deployment file in its repository.
 * Any other `source` scheme is a clear refusal, not a guess.
 */
export const parseRepoInstall = (params: URLSearchParams): IntentParse<string> => {
  const source = params.get("source")?.trim();
  if (!source) {
    return { ok: false, problem: "It does not say which app to install (source=oci:ghcr.io/owner/app)." };
  }
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(source)?.[1]?.toLowerCase();
  if (scheme !== "oci") {
    return {
      ok: false,
      problem: `An install link names the app's published package, as source=oci:ghcr.io/owner/app; "${source}" does not.`,
    };
  }
  const reference = parseOciReference(source.slice("oci:".length).replace(/^\/\//, ""));
  if (!reference) {
    return {
      ok: false,
      problem: `"${source.slice("oci:".length)}" is not a package: name the repository alone (ghcr.io/owner/app), without a tag or a digest.`,
    };
  }
  return { ok: true, value: reference };
};

export const KABINET_INTENTS: readonly IntentDecl<string>[] = [
  {
    name: REPO_INSTALL_INTENT,
    version: 1,
    title: "Install an app",
    // Importing a package acts in one organization's Kabinet.
    picksOrganization: true,
    parse: (params) => parseRepoInstall(params),
    describe: (reference) => reference,
    target: installRepoPath,
  },
];
