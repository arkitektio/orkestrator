import React, { useState } from "react";
import { MySamples } from "../../../components/MySamples";
import { ActionButton } from "../../../layout/ActionButton";
import { PageLayout } from "../../../layout/PageLayout";
import { CreateSampleModal } from "../../../mikro/components/dialogs/CreateSampleModal";

export interface DataSamplesProps {}

export const DataSamples: React.FC<DataSamplesProps> = (props) => {
  const [show, setShow] = useState(false);
  return (
    <PageLayout
      actions={
        <ActionButton
          label="Create new Sample"
          description="Create a new sample"
          onAction={async () => setShow(true)}
        />
      }
    >
      <MySamples />
      <CreateSampleModal show={show} setShow={setShow} />
    </PageLayout>
  );
};
