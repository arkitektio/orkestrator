import React, { useState, useEffect } from "react";
import { MyNodes } from "../../../components/MyNodes";
import { PageLayout } from "../../../layout/PageLayout";

export interface DashboardNodesProps {}

export const DashboardNodes: React.FC<DashboardNodesProps> = (props) => {
  return (
    <PageLayout actions={<></>}>
      <MyNodes />
    </PageLayout>
  );
};
