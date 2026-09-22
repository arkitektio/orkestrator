import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Github } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ListDefinitionsDocument,
  ListReleasesDocument,
  ListReposDocument,
  useCreateGithubRepoMutation,
  useListReposQuery,
} from "../api/graphql";
import { githubIdentifier, parseGithubIdentifier } from "../repoLink";

/**
 * Where an install deeplink lands: "someone wants you to add this repo".
 *
 * The link (`orkestrator:///kabinet/repos/install?repo=user/repo`, wrapped for
 * the web by `installRepoLink`) carries nothing but the repository, so this page
 * is what turns it into a decision — it names what will happen, shows the repo
 * on GitHub, and adds it only when the user says so. A repo already tracked here
 * is not added twice; the page offers it instead.
 */
const InstallRepoPage = () => {
  const [params] = useSearchParams();
  const raw = params.get("repo") ?? "";
  const coordinates = useMemo(() => parseGithubIdentifier(raw), [raw]);
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
          repo.repo.toLowerCase() === coordinates.repo.toLowerCase(),
      )
    : undefined;

  const [add, { loading }] = useCreateGithubRepoMutation({
    refetchQueries: [ListReposDocument, ListReleasesDocument, ListDefinitionsDocument],
  });

  const install = () => {
    if (!coordinates) return;
    add({ variables: { identifier: githubIdentifier(coordinates) } })
      .then((result) => {
        toast.success("Repo added");
        const id = result.data?.createGithubRepo.id;
        if (id) navigate(`/kabinet/repos/${id}`);
      })
      .catch((e: Error) => toast.error("Could not add the repo: " + e.message));
  };

  return (
    <PageLayout title="Install a repo">
      <div className="p-6">
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
                  href={`https://github.com/${githubIdentifier(coordinates)}`}
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
