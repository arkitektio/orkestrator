import { Sidebars } from "@/core/layout/Sidebars";
import { PageLayout } from "@/core/layout/PageLayout";
import { HelpSidebar } from "@/core/layout/help";
import { Link } from "@/core/ui/link";
import React from "react";
import { DashboardLayout } from "../components/sections/DashboardLayout";
import { HomePageStatisticsSidebar } from "../sidebars/HomePageStatisticsSidebar";

export type IRepresentationScreenProps = Record<string, never>;

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout title="Lok" sidebars={
      <Sidebars>
        <Sidebars.Tab label="Statistics">
          <HomePageStatisticsSidebar />
        </Sidebars.Tab>
        <Sidebars.Tab label="Help">
          <HelpSidebar />
        </Sidebars.Tab>
      </Sidebars>

    } pageActions={<>
      <Link to="/lok/record">Record

      </Link></>}>
      <DashboardLayout />
    </PageLayout>
  );
};

export default Page;
