import { useDatalayer } from "@jhnnsrs/datalayer";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { withPort } from "../PortContext";
import { useDetailDeploymentQuery } from "../api/graphql";

export type RepoScanProps = {
  id: string;
};

export const Deployment = (props: RepoScanProps) => {
  const { data, error } = withPort(useDetailDeploymentQuery)({
    variables: { id: props.id },
    pollInterval: 1000,
  });
  const { s3resolve } = useDatalayer();

  if (error) return <div>{error.message} Not Loading </div>;

  return (
    <PageLayout>
      <SectionTitle>
        {data?.deployment?.manifest.identifier}:
        {data?.deployment?.manifest.version}
      </SectionTitle>
      {data?.deployment?.manifest.logo && (
        <img
          src={s3resolve(data?.deployment?.manifest.logo)}
          className="w-20 h-20"
        />
      )}
      {data?.deployment?.manifest.requirements.join("  | ")}
    </PageLayout>
  );
};
