import { PageLayout } from "@/core/layout/PageLayout";
import { Button } from "@/core/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { ArrowRight, Github, Package } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { reportErrorAs } from "@/core/notify";
import { ErrorNote } from "@/core/ui/error-note";
import {
  AppStoreDocument,
  ListDefinitionsDocument,
  ListReleasesDocument,
  ListReposDocument,
  useCreateGithubRepoMutation,
  useImportRepoMutation,
  useListReposQuery,
} from "../api/graphql";
import {
  githubIdentifier,
  isBranchName,
  kabinetIdentifier,
  parseGithubIdentifier,
  parseOciReference,
} from "../repoLink";
import { KABINET_HELP } from "../help";

/**
 * Where an install link lands: "someone wants you to install this app".
 *
 * Published links name the `repo.install` intent
 * (`/do/v1/repo.install?source=oci:ghcr.io/owner/app`, `../intents.ts`); the
 * host's `IntentPage` checks it, asks which organization, and forwards here as
 * `?reference=ghcr.io/owner/app`. This route is internal and free to move.
 *
 * Badges made before intents named a GitHub repository here directly
 * (`?repo=user/repo`); those still land, on `LegacyGithubInstall`.
 */
const InstallRepoPage = () => {
  const [params] = useSearchParams();
  const reference = params.get("reference");
  return reference !== null ? <PackageInstall raw={reference} /> : <LegacyGithubInstall />;
};

/**
 * The link carries nothing but the package, so this page is what turns it
 * into a decision: it names what will happen, links to where the package is
 * published, and imports it only when the user says so. Importing one that is
 * already imported reads it again (Kabinet's `importRepo`), so there is no
 * "already there" state to guard.
 */
const PackageInstall = ({ raw }: { raw: string }) => {
  const reference = useMemo(() => parseOciReference(raw), [raw]);
  const navigate = useNavigate();
  const [failure, setFailure] = useState<unknown>(null);
  const [importRepo, { loading }] = useImportRepoMutation({
    refetchQueries: [ListReleasesDocument, ListDefinitionsDocument, AppStoreDocument],
  });

  const install = () => {
    if (!reference) return;
    setFailure(null);
    importRepo({ variables: { reference } })
      .then((result) => {
        // One app (the usual package): its page. Several, or none yet: the store.
        const apps = new Set(result.data?.importRepo.flavours.map((flavour) => flavour.release.app.id));
        navigate(apps.size === 1 ? `/kabinet/apps/${[...apps][0]}` : "/kabinet/app-store");
      })
      // Shown on the page, not as a toast: the likeliest reason (a package
      // GitHub keeps private) is the server's own sentence, and it needs fixing
      // by whoever published the app, so it should stay readable.
      .catch(setFailure);
  };

  // A package the release workflow publishes is ghcr.io/<the GitHub repository>
  // (lowercased; GitHub's URLs ignore case). Elsewhere the reference is all we know.
  const source = reference?.startsWith("ghcr.io/") ? reference.split("/").slice(1, 3).join("/") : null;

  return (
    <PageLayout title="Install an app" help={KABINET_HELP.installRepo}>
      <div className="p-3">
        {!reference ? (
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>This link does not name a package</CardTitle>
              <CardDescription>
                {`"${raw}" is not a package. An install link names one as ghcr.io/owner/app, without a tag.`}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card className="max-w-xl">
            <CardHeader className="gap-3">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="truncate font-mono">{reference}</span>
              </CardTitle>
              <CardDescription>
                Importing it lets Kabinet read every release published there and offer each one to run. Nothing is
                installed on your machine.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-3">
              {failure ? <ErrorNote error={failure} title="Couldn't import the package" /> : null}
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={install} disabled={loading}>
                  {loading ? "Importing..." : "Import"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
                {source && source.includes("/") && (
                  <Button asChild variant="outline">
                    <a href={`https://github.com/${source}`} target="_blank" rel="noreferrer">
                      <Github className="h-4 w-4" />
                      View on GitHub
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
};

/**
 * Where a pre-intent badge lands (`?repo=user/repo[&branch=…]`): adds the
 * GitHub repository for Kabinet to scan. Nothing builds such a link any more.
 * A repo already tracked here (same branch) is not added twice; the page
 * offers it instead.
 */
const LegacyGithubInstall = () => {
  const [params] = useSearchParams();
  const raw = params.get("repo") ?? "";
  const rawBranch = params.get("branch")?.trim() || undefined;
  const coordinates = useMemo(() => {
    const parsed = parseGithubIdentifier(raw);
    if (!parsed || (rawBranch && !isBranchName(rawBranch))) return null;
    return rawBranch ? { ...parsed, branch: rawBranch } : parsed;
  }, [raw, rawBranch]);
  const navigate = useNavigate();

  const { data } = useListReposQuery({
    variables: { filters: { user: coordinates?.user, repo: coordinates?.repo } },
    skip: !coordinates,
  });

  // The filter is a case-insensitive match on each half, but it is the server's
  // notion of a match — narrow it here so a near-miss is never taken for a hit.
  const existing = coordinates
    ? data?.repos.find(
        (repo) =>
          repo.user.toLowerCase() === coordinates.user.toLowerCase() &&
          repo.repo.toLowerCase() === coordinates.repo.toLowerCase() &&
          // Kabinet tracks each branch on its own; no branch means its default.
          repo.branch === (coordinates.branch ?? "main"),
      )
    : undefined;

  const [add, { loading }] = useCreateGithubRepoMutation({
    refetchQueries: [ListReposDocument, ListReleasesDocument, ListDefinitionsDocument],
  });

  const install = () => {
    if (!coordinates) return;
    add({ variables: { identifier: kabinetIdentifier(coordinates) } })
      .then((result) => {
        const id = result.data?.createGithubRepo.id;
        if (id) navigate(`/kabinet/repos/${id}`);
      })
      .catch(reportErrorAs("Couldn't add the repository"));
  };

  return (
    <PageLayout title="Install a repo" help={KABINET_HELP.installRepo}>
      <div className="p-3">
        {!coordinates ? (
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>This link does not name a repository</CardTitle>
              <CardDescription>
                {raw
                  ? `"${raw}" is not a GitHub repository. An install link carries one as user/repo.`
                  : "An install link carries the repository as user/repo."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card className="max-w-xl">
            <CardHeader className="gap-3">
              <CardTitle className="flex items-center gap-2">
                <Github className="h-4 w-4" />
                <span className="truncate">{githubIdentifier(coordinates)}</span>
                {coordinates.branch && (
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">@ {coordinates.branch}</span>
                )}
              </CardTitle>
              <CardDescription>
                {existing
                  ? "This repository is already tracked by your Kabinet."
                  : "Adding it lets Kabinet read the repository's manifest and offer every app it declares. Nothing is installed on your machine."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              {existing ? (
                <Button onClick={() => navigate(`/kabinet/repos/${existing.id}`)}>
                  Open repo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={install} disabled={loading}>
                  {loading ? "Adding..." : "Add repo"}
                </Button>
              )}
              <Button asChild variant="outline">
                <a
                  href={`https://github.com/${githubIdentifier(coordinates)}${
                    coordinates.branch ? `/tree/${coordinates.branch.split("/").map(encodeURIComponent).join("/")}` : ""
                  }`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Github className="h-4 w-4" />
                  View on GitHub
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
};

export default InstallRepoPage;
