import React, { useState } from "react";
import { MyExperiments } from "../../../components/MyExperiments";
import { ActionButton } from "../../../layout/ActionButton";
import { PageLayout } from "../../../layout/PageLayout";

export interface DataExperimentsProps {}

export const DataExperiments: React.FC<DataExperimentsProps> = (props) => {
  const [show, setShow] = useState(false);
  return (
    <PageLayout
      actions={
        <ActionButton
          label="New Experiment"
          description="Creates a new experiment"
          onAction={async () => setShow(true)}
        />
      }
    >
      <MyExperiments limit={10} />
    </PageLayout>
  );
};

export default DataExperiments;
