import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import {
  useDetailContainerQuery,
  useStopContainerMutation,
  useRestartContainerMutation,
  useRemoveContainerMutation,
  useDetailWhaleQuery,
  useDetailGithubRepoQuery,
  useDetailRepoScanQuery,
} from "../api/graphql";
import { withPort } from "../PortContext";

export type RepoScanProps = {
  id: string;
};

export const RepoScan = (props: RepoScanProps) => {
  const { data } = withPort(useDetailRepoScanQuery)({
    variables: { id: props.id },
    pollInterval: 1000,
  });

  const [restart] = withPort(useRestartContainerMutation)();
  const [stop] = withPort(useStopContainerMutation)();
  const [remove] = withPort(useRemoveContainerMutation)();

  return (
    <PageLayout>
      <SectionTitle>Repo Identifier {data?.reposcan?.identifier}</SectionTitle>
      <div className="text-white">
        <div className="text-2xl">
          Container hosting {data?.reposcan?.version}
        </div>
      </div>
    </PageLayout>
  );
};
