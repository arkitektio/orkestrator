import React, { useState, useEffect } from "react";
import { MyTemplates } from "../../../components/MyTemplates";
import { PageLayout } from "../../../layout/PageLayout";

export interface DashboardTemplatesProps {}

export const DashboardTemplates: React.FC<DashboardTemplatesProps> = (
  props
) => {
  return (
    <PageLayout>
      <MyTemplates />
    </PageLayout>
  );
};
