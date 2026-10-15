import { Sidebars } from "@/core/layout/Sidebars";
import { LOK_HELP } from "../help";
import { PageLayout } from "@/core/layout/PageLayout";
import { HelpSidebar } from "@/core/layout/help";
import { ModuleHome } from "@/core/layout/ModuleHome";
import { SlotSections } from "@/core/layout/PageSections";
import { useSelf } from "@/core/connection/useSelf";
import { Link } from "@/core/ui/link";
import React from "react";
import { Username } from "../components/Me";
import { RecentAppsSection } from "../components/sections/RecentAppsSection";
import { HomePageStatisticsSidebar } from "../sidebars/HomePageStatisticsSidebar";

/**
 * Team's front door: its pages, then what other modules put on your home
 * (kraph: latest mentions, top priority — each behind its own guard), then a
 * few of the organization's apps. The people are on Members, one tile away.
 */
const Page: React.FC = () => {
  const { userId } = useSelf();
  return (
    <PageLayout help={LOK_HELP.overview} title="Team" sidebars={
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
      <ModuleHome
        moduleKey="lok"
        title={<>Welcome back, <Username /></>}
        description="Your organization: its members, the apps acting for you, and what the other modules have for you."
      >
        {userId && <SlotSections slot="home" identifier="@lok/user" object={{ id: userId }} />}
        <RecentAppsSection />
      </ModuleHome>
    </PageLayout>
  );
};

export default Page;
