import React, { useState } from "react";
import { MyModels } from "../../../components/MyModels";
import { ActionButton } from "../../../layout/ActionButton";
import { PageLayout } from "../../../layout/PageLayout";

export interface DataExperimentsProps {}

export const DataLinks: React.FC<DataExperimentsProps> = (props) => {
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
      <MyModels limit={20} />
    </PageLayout>
  );
};

export default DataLinks;
