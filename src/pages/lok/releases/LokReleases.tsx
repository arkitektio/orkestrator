import React from "react";
import { ResponsiveGrid } from "../../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../../floating/utils";
import { PageLayout } from "../../../layout/PageLayout";
import { SectionTitle } from "../../../layout/SectionTitle";
import { App } from "../../../linker";
import { useReleasesQuery } from "../../../lok/api/graphql";
import { withMan } from "../../../lok/man";

export interface ManUserProps {}

export const LokReleases: React.FC<ManUserProps> = (props) => {
  const { data } = withMan(useReleasesQuery)();

  return (
    <PageLayout>
      #<SectionTitle>My Apps</SectionTitle>
      <ResponsiveGrid>
        {data?.releases?.filter(notEmpty).map((release) => (
          <App.Smart object={release.id} className="bg-primary-200 p-3 rounded">
            <App.DetailLink object={release.id}>
              {release?.app?.identifier}:{release.version}
            </App.DetailLink>
          </App.Smart>
        ))}
      </ResponsiveGrid>
    </PageLayout>
  );
};
