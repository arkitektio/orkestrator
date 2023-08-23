import React, { useState, useEffect } from "react";
import { MyAgents } from "../../../components/MyAgents";
import { PageLayout } from "../../../layout/PageLayout";

export interface DashboardAgentsProps {}

export const DashboardAgents: React.FC<DashboardAgentsProps> = (props) => {
  return (
    <PageLayout>
      <MyAgents />
    </PageLayout>
  );
};
