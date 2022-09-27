import React, { useState, useEffect } from "react";
import { MyRepositories } from "../../../components/MyRepositories";
import { PageLayout } from "../../../layout/PageLayout";

export interface DashboardRepositoriesProps {}

export const DashboardRepositories: React.FC<DashboardRepositoriesProps> = (
  props
) => {
  return (
    <PageLayout>
      <MyRepositories></MyRepositories>
    </PageLayout>
  );
};
