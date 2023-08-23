import React from "react";
import { PageLayout } from "../../../layout/PageLayout";
import { useDialog } from "../../../layout/dialog/DialogProvider";
import { MyStages } from "../../../mikro/components/MyStages";

export interface DataStagesProps {}

export const DataTimepoints: React.FC<DataStagesProps> = (props) => {
  const { ask } = useDialog();
  return (
    <PageLayout>
      <MyStages limit={20} />
    </PageLayout>
  );
};
