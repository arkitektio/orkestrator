import { ResponsiveContainerGrid } from "@/core/layout/ContainerGrid";
import { Sidebars } from "@/core/layout/Sidebars";
import { PageLayout } from "@/core/layout/PageLayout";
import { HelpSidebar } from "@/core/layout/help";
import { HomeEmpty, HomeError, HomeSection, ModuleHome } from "@/core/layout/ModuleHome";
import { KraphGraph } from "@/core/linkers";
import React from "react";
import { useHomePageQuery } from "../api/graphql";
import GraphCard from "../components/cards/GraphCard";
import { ClaimActList } from "../components/lists/ClaimActList";
import { HomePageStatisticsSidebar } from "../sidebars/HomePageStatisticsSidebar";
import { KRAPH_HELP } from "../help";

export type IRepresentationScreenProps = Record<string, never>;

const Page: React.FC<IRepresentationScreenProps> = () => {
  const { data, loading, error, refetch } = useHomePageQuery();

  return (
    <PageLayout
      help={KRAPH_HELP.home}
      title="Kraph"
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Statistics">
            <HomePageStatisticsSidebar />
          </Sidebars.Tab>
          <Sidebars.Tab label="Help">
            <HelpSidebar />
          </Sidebars.Tab>
        </Sidebars>
      }
    >

      <ModuleHome
        moduleKey="kraph"
        title="Kraph"
        description="What your organization has said about its data, and the views that read it."
      >
        {error && !data ? (
          <HomeError what="what was claimed" error={error} onRetry={() => refetch()} />
        ) : loading && !data ? null : (
          <>
            <HomeSection title="Latest claims">
              {data?.acts.length ? (
                <ClaimActList acts={data.acts} />
              ) : (
                <HomeEmpty title="Nothing claimed yet">
                  Right-click a datum anywhere in the app, an annotation for example,
                  to say what it means.
                </HomeEmpty>
              )}
            </HomeSection>
            {data?.graphs.length ? (
              <HomeSection
                title={<KraphGraph.ListLink className="hover:text-foreground">Views</KraphGraph.ListLink>}
              >
                <ResponsiveContainerGrid className="gap-4">
                  {data.graphs.map((graph) => (
                    <GraphCard key={graph.id} item={graph} />
                  ))}
                </ResponsiveContainerGrid>
              </HomeSection>
            ) : null}
          </>
        )}
      </ModuleHome>
    </PageLayout>
  );
};

export default Page;
