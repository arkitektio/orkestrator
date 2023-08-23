import React from "react";
import { useDialog } from "../../../layout/dialog/DialogProvider";
import { PageLayout } from "../../../layout/PageLayout";
import { MyStages } from "../../../mikro/components/MyStages";

export interface DataStagesProps {}

export const DataStages: React.FC<DataStagesProps> = (props) => {
  const { ask } = useDialog();
  return (
    <PageLayout>
      <MyStages limit={20} />
    </PageLayout>
  );
};
