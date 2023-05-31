import React, { useState } from "react";
import { MyDatasets } from "../../../components/MyDatasets";
import { PageLayout } from "../../../layout/PageLayout";

export interface DataExperimentsProps {}

export const DataDatasets: React.FC<DataExperimentsProps> = (props) => {
  const [show, setShow] = useState(false);
  return (
    <PageLayout>
      <MyDatasets limit={20} />
    </PageLayout>
  );
};
