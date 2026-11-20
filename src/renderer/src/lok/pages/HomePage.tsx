import { LOK_HELP } from "../help";
import { PageLayout } from "@/core/layout/PageLayout";
import { ModuleHome, ModuleHomeSidebars } from "@/core/layout/ModuleHome";
import { Link } from "@/core/ui/link";
import React from "react";
import { RecentAppsSection } from "../components/sections/RecentAppsSection";
import { useHomePageStatsQuery } from "../api/graphql";

/**
 * Team's front door: its pages are the sidebar's Overview tab; the stage is a
 * few of the organization's apps. The people are on Members. What the other
 * modules have for the member (calls, tasks, todos) is on the app's home page.
 */
const Page: React.FC = () => {
  const { data: stats } = useHomePageStatsQuery();
  return (
    <PageLayout help={LOK_HELP.overview} title="Team" sidebars={
      <ModuleHomeSidebars
        moduleKey="lok"
        stats={stats ? { "/lok/users": { count: stats.userStats.count } } : undefined}
      />
    } pageActions={<>
      <Link to="/lok/record">Record

      </Link></>}>
      <ModuleHome
        moduleKey="lok"
        pages={false}
        title="Team"
        description="Your organization: its members and the apps acting for you."
      >
        <RecentAppsSection />
      </ModuleHome>
    </PageLayout>
  );
};

export default Page;
