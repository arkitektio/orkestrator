import React, { useState, useEffect } from "react";
import { MyProvisions } from "../../../components/MyProvisions";
import { PageLayout } from "../../../layout/PageLayout";

export interface DashboardProvisionsProps {}

export const DashboardProvisions: React.FC<DashboardProvisionsProps> = (
  props
) => {
  return (
    <PageLayout>
      <MyProvisions />
    </PageLayout>
  );
};
