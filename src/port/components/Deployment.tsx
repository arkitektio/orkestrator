import { useDatalayer } from "@jhnnsrs/datalayer";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { withPort } from "../PortContext";
import { useDetailDeploymentQuery } from "../api/graphql";

export type RepoScanProps = {
  id: string;
};

export const Deployment = (props: RepoScanProps) => {
  const { data } = withPort(useDetailDeploymentQuery)({
    variables: { id: props.id },
    pollInterval: 1000,
  });
  const { s3resolve } = useDatalayer();

  return (
    <PageLayout>
      <SectionTitle>
        Deployment for: {data?.deployment?.manifest.identifier}
      </SectionTitle>
      {data?.deployment?.manifest.logo && (
        <img src={s3resolve(data?.deployment?.manifest.logo)} />
      )}

      <div className="text-white">
        <div className="text-2xl">
          This deployment is versioned as: {data?.deployment?.manifest.version}
        </div>
      </div>
    </PageLayout>
  );
};
