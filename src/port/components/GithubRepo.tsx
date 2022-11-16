import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
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
      <SectionTitle>Whale {data?.githubRepo?.branch}</SectionTitle>
      <div className="text-white">
        <div className="text-2xl">
          Container hosting {data?.githubRepo?.repo}
        </div>
      </div>
    </PageLayout>
  );
};
