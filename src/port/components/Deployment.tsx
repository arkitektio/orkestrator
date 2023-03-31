import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import {
  useDetailDeploymentQuery,
  useDetailRepoScanQuery,
  useRemoveContainerMutation,
  useRestartContainerMutation,
  useStopContainerMutation,
} from "../api/graphql";
import { withPort } from "../PortContext";

export type RepoScanProps = {
  id: string;
};

export const Deployment = (props: RepoScanProps) => {
  const { data } = withPort(useDetailDeploymentQuery)({
    variables: { id: props.id },
    pollInterval: 1000,
  });

  const [restart] = withPort(useRestartContainerMutation)();
  const [stop] = withPort(useStopContainerMutation)();
  const [remove] = withPort(useRemoveContainerMutation)();

  return (
    <PageLayout>
      <SectionTitle>
        Deployment for: {data?.deployment?.identifier}
      </SectionTitle>
      <div className="text-white">
        <div className="text-2xl">
          This deployment is running {data?.deployment?.version}
        </div>
      </div>
    </PageLayout>
  );
};
