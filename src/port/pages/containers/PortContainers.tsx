import React, { useState } from "react";
import { ActionButton } from "../../../layout/ActionButton";
import { PageLayout } from "../../../layout/PageLayout";
import { MyContainers } from "../../../port/components/MyContainers";

export interface PortContainersProps {}

export const PortContainers: React.FC<PortContainersProps> = (props) => {
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
      <MyContainers />
    </PageLayout>
  );
};
