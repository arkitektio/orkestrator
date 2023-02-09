import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { RepoScan } from "../../linker";
import {
  useDetailContainerQuery,
  useStopContainerMutation,
  useRestartContainerMutation,
  useRemoveContainerMutation,
  useDetailWhaleQuery,
  useDetailGithubRepoQuery,
} from "../api/graphql";
import { withPort } from "../PortContext";

export type GithubRepoProps = {
  id: string;
};

export const GithubRepo = (props: GithubRepoProps) => {
  const { data } = withPort(useDetailGithubRepoQuery)({
    variables: { id: props.id },
    pollInterval: 1000,
  });

  const [restart] = withPort(useRestartContainerMutation)();
  const [stop] = withPort(useStopContainerMutation)();
  const [remove] = withPort(useRemoveContainerMutation)();

  return (
    <PageLayout>
      <SectionTitle>Github Repo </SectionTitle>
      <div className="text-white">
        <div className="text-2xl">
          {data?.githubRepo?.user}/{data?.githubRepo?.repo}:
          {data?.githubRepo?.branch}
        </div>
        <a
          href={`https://github.com/${data?.githubRepo?.user}/${data?.githubRepo?.repo}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open{" "}
        </a>
      </div>
      <SectionTitle>Possible Deployments of this app</SectionTitle>
      <ResponsiveContainerGrid>
        {data?.githubRepo?.scans?.filter(notEmpty).map((scan) => (
          <RepoScan.Smart object={scan.id} className="bg-gray-300 p-5 rounded">
            <RepoScan.DetailLink object={scan.id}>
              {scan.identifier}:{scan.version}
            </RepoScan.DetailLink>
          </RepoScan.Smart>
        ))}
      </ResponsiveContainerGrid>
    </PageLayout>
  );
};
