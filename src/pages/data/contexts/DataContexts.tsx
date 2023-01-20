import React, { useState } from "react";
import { MyContexts } from "../../../components/MyContexts";
import { MyExperiments } from "../../../components/MyExperiments";
import { ActionButton } from "../../../layout/ActionButton";
import { PageLayout } from "../../../layout/PageLayout";
import { CreateExperimentModal } from "../../../mikro/components/dialogs/CreateExperimentModal";

export interface DataExperimentsProps {}

export const DataContexts: React.FC<DataExperimentsProps> = (props) => {
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
      <MyContexts />
    </PageLayout>
  );
};
