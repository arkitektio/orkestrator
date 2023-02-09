import React, { useState } from "react";
import { MyDatasets } from "../../../components/MyDatasets";
import { MyExperiments } from "../../../components/MyExperiments";
import { ActionButton } from "../../../layout/ActionButton";
import { PageLayout } from "../../../layout/PageLayout";
import { CreateExperimentModal } from "../../../mikro/components/dialogs/CreateExperimentModal";

export interface DataExperimentsProps {}

export const DataDatasets: React.FC<DataExperimentsProps> = (props) => {
  const [show, setShow] = useState(false);
  return (
    <PageLayout>
      <MyDatasets limit={20} />
    </PageLayout>
  );
};
