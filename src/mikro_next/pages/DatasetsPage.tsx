import React from "react";
import { PageLayout } from "../../layout/PageLayout";
import { useDialog } from "../../providers/dialog/DialogProvider";
import DatasetList from "../components/lists/DatasetList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const { ask } = useDialog();

  return (
    <PageLayout actions={<></>}>
      <DatasetList pagination={{ limit: 30 }} />
    </PageLayout>
  );
};

export default Page;
