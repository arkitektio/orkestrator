import React, { useState } from "react";
import { ActionButton } from "../../../layout/ActionButton";
import { PageLayout } from "../../../layout/PageLayout";
import { MyWhales } from "../../../port/components/MyWhales";

export interface PortContainersProps {}

export const PortWhales: React.FC<PortContainersProps> = (props) => {
  const [show, setShow] = useState(false);
  return (
    <PageLayout
      actions={
        <ActionButton
          label="New WHale"
          description="Creates a new whale"
          onAction={async () => setShow(true)}
        />
      }
    >
      <MyWhales />
    </PageLayout>
  );
};
