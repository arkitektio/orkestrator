import React, { useState, useEffect } from "react";
import { MyAssignations } from "../../../components/MyAssignations";
import { PageLayout } from "../../../layout/PageLayout";

export interface DashboardAssignationsProps {}

export const DashboardAssignations: React.FC<DashboardAssignationsProps> = (
  props
) => {
  return (
    <PageLayout>
      <MyAssignations />
    </PageLayout>
  );
};
