import React from "react";
import { ResponsiveGrid } from "../../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../../floating/utils";
import { PageLayout } from "../../../layout/PageLayout";
import { SectionTitle } from "../../../layout/SectionTitle";
import { LokApp } from "../../../linker";
import { withLok } from "../../../lok/LokContext";
import { useMyPrivateClientsQuery } from "../../../lok/api/graphql";

export interface ManUserProps {}

export const LokClients: React.FC<ManUserProps> = (props) => {
  const { data } = withLok(useMyPrivateClientsQuery)();

  return (
    <PageLayout>
      #<SectionTitle>My Apps</SectionTitle>
      <ResponsiveGrid>
        {data?.myPrivateClients?.filter(notEmpty).map((c) => (
          <LokApp.Smart object={c.id} className="bg-primary-200 p-3 rounded">
            <LokApp.DetailLink object={c.id}>
              {c?.release?.app?.identifier}:{c?.release?.version}
            </LokApp.DetailLink>
          </LokApp.Smart>
        ))}
      </ResponsiveGrid>
    </PageLayout>
  );
};
