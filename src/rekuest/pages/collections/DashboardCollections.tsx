import React from "react";
import { MyCollections } from "../../../components/MyCollections";
import { PageLayout } from "../../../layout/PageLayout";

export interface DashboardRepositoriesProps {}

export const DashboardCollections: React.FC<DashboardRepositoriesProps> = (
  props
) => {
  return (
    <PageLayout>
      <MyCollections />
    </PageLayout>
  );
};
