import React, { useState } from "react";
import { MyExperiments } from "../../../components/MyExperiments";
import { ActionButton } from "../../../layout/ActionButton";
import { PageLayout } from "../../../layout/PageLayout";
import { CreateExperimentModal } from "../../../mikro/components/dialogs/CreateExperimentModal";

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
      <MyExperiments />
      <CreateExperimentModal setShow={setShow} show={show} />
    </PageLayout>
  );
};
