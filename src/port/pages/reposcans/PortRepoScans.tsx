import React, { useState } from "react";
import { ActionButton } from "../../../layout/ActionButton";
import { PageLayout } from "../../../layout/PageLayout";
import { MyWhales } from "../../../port/components/MyWhales";

export interface PortContainersProps {}

export const PortRepoScans: React.FC<PortContainersProps> = (props) => {
  const [show, setShow] = useState(false);
  return (
    <PageLayout
      actions={
        <ActionButton
          label="New Repo"
          description="Creates a new repo"
          onAction={async () => setShow(true)}
        />
      }
    >
      <MyWhales />
    </PageLayout>
  );
};
