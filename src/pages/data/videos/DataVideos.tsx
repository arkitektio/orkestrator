import React, { useState } from "react";
import { MyVideos } from "../../../components/MyVideos";
import { PageLayout } from "../../../layout/PageLayout";

export interface DataExperimentsProps {}

export const DataVideos: React.FC<DataExperimentsProps> = (props) => {
  const [show, setShow] = useState(false);
  return (
    <PageLayout>
      <MyVideos limit={20} />
    </PageLayout>
  );
};

export default DataVideos;
