import { ResponsiveContainerGrid } from "@arkitektio/bsx/ports/layout/ContainerGrid";
import { PageLayout } from "@/core/layout/PageLayout";
import { HomeEmpty, HomeError, HomeSection, ModuleHome, ModuleHomeSidebars } from "@/core/layout/ModuleHome";
import { DialogButton } from "@/core/ui/dialog-button";
import { KraphGraph } from "@/core/linkers";
import { PlusIcon } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useHomePageQuery, useHomePageStatsQuery } from "../api/graphql";
import GraphCard from "../components/cards/GraphCard";
import { KRAPH_HELP } from "../help";

export type IRepresentationScreenProps = Record<string, never>;

const Page: React.FC<IRepresentationScreenProps> = () => {
  const { data, loading, error, refetch } = useHomePageQuery();

  const { data: stats } = useHomePageStatsQuery();
  const navigate = useNavigate();

  return (
    <PageLayout
      help={KRAPH_HELP.home}
      title="Kraph"
      sidebars={
        <ModuleHomeSidebars
          moduleKey="kraph"
          stats={stats ? { "/kraph/graphs": { count: stats.graphStats.count } } : undefined}
        />
      }
    >

      <ModuleHome
        moduleKey="kraph"
        pages={false}
        title="Kraph"
        description="Knowledge graphs over your data: what you track, what you did and what you measured."
      >
        {error && !data ? (
          <HomeError what="your graphs" error={error} onRetry={() => refetch()} />
        ) : loading && !data ? null : data?.graphs.length == 0 ? (
          <HomeEmpty title="No graphs yet">
            A graph holds the entities, events and measurements you record.{" "}
            <DialogButton
              name="creategraph"
              variant="outline"
              size="sm"
              className="ml-1"
              dialogProps={{
                onSuccess: (data) => navigate(KraphGraph.linkBuilder(data.createGraph.id)),
              }}
            >
              <PlusIcon className="h-4 w-4" />
              Create your first graph
            </DialogButton>
          </HomeEmpty>
        ) : (
          <HomeSection
            title={<KraphGraph.ListLink className="hover:text-foreground">Graphs</KraphGraph.ListLink>}
          >
            <ResponsiveContainerGrid className="gap-4">
              {data?.graphs.map((graph) => (
                <GraphCard key={graph.id} item={graph} />
              ))}
            </ResponsiveContainerGrid>
          </HomeSection>
        )}
      </ModuleHome>
    </PageLayout>
  );
};

export default Page;
