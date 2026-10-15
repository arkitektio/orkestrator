import { ResponsiveContainerGrid } from "@/core/layout/ContainerGrid";
import { Sidebars } from "@/core/layout/Sidebars";
import { PageLayout } from "@/core/layout/PageLayout";
import { HelpSidebar } from "@/core/layout/help";
import { HomeEmpty, HomeError, HomeSection, ModuleHome } from "@/core/layout/ModuleHome";
import { DialogButton } from "@/core/ui/dialog-button";
import { KraphGraph } from "@/core/linkers";
import { PlusIcon } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useHomePageQuery } from "../api/graphql";
import GraphCard from "../components/cards/GraphCard";
import { HomePageStatisticsSidebar } from "../sidebars/HomePageStatisticsSidebar";
import { KRAPH_HELP } from "../help";

export type IRepresentationScreenProps = Record<string, never>;

const Page: React.FC<IRepresentationScreenProps> = () => {
  const { data, loading, error, refetch } = useHomePageQuery();

  const navigate = useNavigate();

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
