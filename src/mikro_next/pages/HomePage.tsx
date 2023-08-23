import React from "react";
import { PageLayout } from "../../layout/PageLayout";
import { useDialog } from "../../layout/dialog/DialogProvider";
import DatasetList from "../components/lists/DatasetList";
import ImageList from "../components/lists/ImageList";
import StageList from "../components/lists/StageList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const { ask } = useDialog();

  return (
    <PageLayout actions={<></>}>
      <ImageList pagination={{ limit: 30 }} />
      <DatasetList pagination={{ limit: 30 }} />
      <StageList pagination={{ limit: 30 }} />
    </PageLayout>
  );
};

export default Page;
