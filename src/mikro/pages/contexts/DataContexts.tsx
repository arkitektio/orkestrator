import React, { useState } from "react";
import { MyContexts } from "../../../components/MyContexts";
import { ActionButton } from "../../../layout/ActionButton";
import { PageLayout } from "../../../layout/PageLayout";

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
      <MyContexts limit={20} />
    </PageLayout>
  );
};

export default DataContexts;
