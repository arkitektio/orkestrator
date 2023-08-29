import React from "react";
import { PageLayout } from "../../../layout/PageLayout";
import { MyStages } from "../../../mikro/components/MyStages";
import { useDialog } from "../../../providers/dialog/DialogProvider";

export interface DataStagesProps {}

export const DataStages: React.FC<DataStagesProps> = (props) => {
  const { ask } = useDialog();
  return (
    <PageLayout>
      <MyStages limit={20} />
    </PageLayout>
  );
};
