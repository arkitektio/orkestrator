import { useDatalayer } from "@jhnnsrs/datalayer";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { withPort } from "../PortContext";
import {
  useDetailDeploymentQuery,
  useRemoveContainerMutation,
  useRestartContainerMutation,
  useStopContainerMutation,
} from "../api/graphql";

export type RepoScanProps = {
  id: string;
};

export const Deployment = (props: RepoScanProps) => {
  const { data } = withPort(useDetailDeploymentQuery)({
    variables: { id: props.id },
    pollInterval: 1000,
  });
  const { s3resolve } = useDatalayer();
  const [restart] = withPort(useRestartContainerMutation)();
  const [stop] = withPort(useStopContainerMutation)();
  const [remove] = withPort(useRemoveContainerMutation)();

  return (
    <PageLayout>
      <SectionTitle>
        Deployment for: {data?.deployment?.identifier}
      </SectionTitle>
      {data?.deployment?.logo && (
        <img src={s3resolve(data?.deployment?.logo)} />
      )}

      <div className="text-white">
        <div className="text-2xl">
          This deployment is running {data?.deployment?.version}
        </div>
      </div>
    </PageLayout>
  );
};
