import { ResponsiveContainerGrid } from "@/core/components/layout/ContainerGrid";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { PageLayout } from "@/core/components/layout/PageLayout";
import { HelpSidebar } from "@/core/components/sidebars/help";
import { Button } from "@/core/components/ui/button";
import {
  CardDescription,
  CardHeader,
  CardTitle
} from "@/core/components/ui/card";
import { DialogButton } from "@/core/components/ui/dialog-button";
import { KraphGraph } from "@/core/linkers";
import {
  BarChart3,
  Network,
  PlusIcon,
  TrendingUp,
} from "lucide-react";
import React from "react";
import { PiGraph } from "react-icons/pi";
import { useNavigate } from "react-router-dom";
import { useHomePageQuery } from "../api/graphql";
import GraphCard from "../components/cards/GraphCard";
import { HomePageStatisticsSidebar } from "../sidebars/HomePageStatisticsSidebar";

export type IRepresentationScreenProps = Record<string, never>;

const Page: React.FC<IRepresentationScreenProps> = () => {
  const { data, loading } = useHomePageQuery();

  const navigate = useNavigate();

  return (
    <PageLayout
      title="Home"
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

      {
        loading ? (
          // Loading State
          <div className="min-h-[60vh] w-full flex items-center justify-center" >
            <div className="text-center space-y-4">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-muted-foreground">Loading your graphs...</p>
            </div>
          </div >
        ) : data?.graphs.length == 0 ? (
          // Empty State with Hero Design
          <div className="min-h-full w-full flex items-center justify-center rounded-lg">
            <div className="max-w-4xl mx-auto text-center px-6 py-16">
              {/* Hero Section */}
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="p-6 ">
                    <PiGraph className="h-16 w-16 text-primary" />
                  </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    Welcome to Kraph
                  </span>
                </h1>

                <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                  Your powerful data visualization and knowledge graph platform.
                  Create your first graph to start exploring and organizing your
                  data relationships.
                </p>
              </div>

              {/* Action Section */}
              <div className="mt-12 space-y-6">
                <DialogButton
                  name="creategraph"
                  variant={"default"}
                  size={"lg"}
                  dialogProps={{
                    onSuccess: (data) => navigate(KraphGraph.linkBuilder(data.createGraph.id)),
                  }}
                >
                  <Button className="flex items-center gap-3 px-6 py-2 ">
                    <PlusIcon className="h-5 w-5" />
                    <span className="text-lg">Create Your First Graph</span>
                  </Button>
                </DialogButton>

                <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Visualize Relationships</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4" />
                    <span>Build Connections</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Analyze Data</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Dashboard View with Data
          <div className="space-y-8 p-3">
            {/* Welcome Header */}
            <CardHeader>
              <CardTitle className="text-3xl flex items-center gap-3">
                <PiGraph className="h-8 w-8 text-primary" />
                Your Graphs
              </CardTitle>
              <CardDescription className="text-lg">
                Explore and manage your knowledge graphs with powerful
                visualization tools
              </CardDescription>
            </CardHeader>

            <ResponsiveContainerGrid className="gap-4">
              {data?.graphs.map((graph) => (
                <GraphCard key={graph.id} item={graph} />
              ))}
            </ResponsiveContainerGrid>
          </div>
        )}
    </PageLayout >
  );
};

export default Page;
