import React from "react";
import { PageLayout } from "../../layout/PageLayout";
import { useDialog } from "../../layout/dialog/DialogProvider";
import ImageList from "../components/lists/ImageList";

export type IRepresentationScreenProps = {};

const ImagesPage: React.FC<IRepresentationScreenProps> = () => {
  const { ask } = useDialog();

  return (
    <PageLayout actions={<></>}>
      haahah
      <ImageList pagination={{ limit: 30 }} />
    </PageLayout>
  );
};

export default ImagesPage;
