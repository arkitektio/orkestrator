import React, { useState } from "react";
import { MyGraphs } from "../../../components/MyGraphs";
import { PageLayout } from "../../../layout/PageLayout";

export interface DataExperimentsProps {}

export const DataGraphs: React.FC<DataExperimentsProps> = (props) => {
  const [show, setShow] = useState(false);
  return (
    <PageLayout>
      <MyGraphs limit={20} />
    </PageLayout>
  );
};

export default DataGraphs;
