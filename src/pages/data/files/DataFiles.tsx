import React from "react";
import { MyFiles } from "../../../components/MyFiles";
import { PageLayout } from "../../../layout/PageLayout";

export interface DataFilesProps {}

export const DataFiles: React.FC<DataFilesProps> = (props) => {
  return (
    <PageLayout>
      <MyFiles />
    </PageLayout>
  );
};
