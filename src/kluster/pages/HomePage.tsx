import { withKluster } from "@jhnnsrs/kluster";
import React from "react";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { useCreateNewClusterMutation } from "../api/graphql";
import DaskClusterList from "../components/lists/DaskClusterList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {

  const [create] = withKluster(useCreateNewClusterMutation)({
    variables: {
      name: "test",
    },
    refetchQueries: ["ListCluster"],
  });




  return (
    <PageLayout actions={<ActionButton onAction={async () => { await create()}} label="Create New Cluster"></ActionButton>}>
      <DaskClusterList/>
    </PageLayout>
  );
};

export default Page;
