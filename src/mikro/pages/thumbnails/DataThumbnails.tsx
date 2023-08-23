import React, { useState } from "react";
import { MyThumbnails } from "../../../components/MyThumbnails";
import { PageLayout } from "../../../layout/PageLayout";

export interface DataExperimentsProps {}

export const DataThumbnails: React.FC<DataExperimentsProps> = (props) => {
  const [show, setShow] = useState(false);
  return (
    <PageLayout>
      <MyThumbnails limit={20} />
    </PageLayout>
  );
};

export default DataThumbnails;
