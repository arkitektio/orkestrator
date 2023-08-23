import React, { useState, useEffect } from "react";
import { MyTeams } from "../../../components/MyTeams";
import { PageLayout } from "../../../layout/PageLayout";

export interface ManTeamsProps {}

export const ManTeams: React.FC<ManTeamsProps> = (props) => {
  return (
    <PageLayout>
      <MyTeams />
    </PageLayout>
  );
};
