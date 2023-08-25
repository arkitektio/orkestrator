import React from "react";
import { ResponsiveGrid } from "../../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../../floating/utils";
import { PageLayout } from "../../../layout/PageLayout";
import { SectionTitle } from "../../../layout/SectionTitle";
import { LokApp } from "../../../linker";
import { withLok } from "../../../lok/LokContext";
import { useAppsQuery } from "../../../lok/api/graphql";

export interface ManUserProps {}

export const LokApps: React.FC<ManUserProps> = (props) => {
  const { data } = withLok(useAppsQuery)();

  return (
    <PageLayout>
      #<SectionTitle>My Apps</SectionTitle>
      <ResponsiveGrid>
        {data?.apps?.filter(notEmpty).map((app) => (
          <LokApp.Smart object={app.id} className="bg-primary-200 p-3 rounded">
            <LokApp.DetailLink object={app.id}>
              {app.identifier}
            </LokApp.DetailLink>
          </LokApp.Smart>
        ))}
      </ResponsiveGrid>
    </PageLayout>
  );
};
