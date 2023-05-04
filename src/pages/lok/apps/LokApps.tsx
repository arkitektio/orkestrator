import React from "react";
import { ResponsiveGrid } from "../../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../../floating/utils";
import { PageLayout } from "../../../layout/PageLayout";
import { SectionTitle } from "../../../layout/SectionTitle";
import { App } from "../../../linker";
import { useAppsQuery } from "../../../lok/api/graphql";
import { withMan } from "../../../lok/man";

export interface ManUserProps {}

export const LokApps: React.FC<ManUserProps> = (props) => {
  const { data } = withMan(useAppsQuery)();

  return (
    <PageLayout>
      #<SectionTitle>My Apps</SectionTitle>
      <ResponsiveGrid>
        {data?.apps?.filter(notEmpty).map((app) => (
          <App.Smart object={app.id} className="bg-primary-200 p-3 rounded">
            <App.DetailLink object={app.id}>{app.identifier}</App.DetailLink>
          </App.Smart>
        ))}
      </ResponsiveGrid>
    </PageLayout>
  );
};
