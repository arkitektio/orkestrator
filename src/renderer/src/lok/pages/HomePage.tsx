import { LOK_HELP } from "../help";
import { PageLayout } from "@/core/layout/PageLayout";
import { ModuleHome, ModuleHomeSidebars } from "@/core/layout/ModuleHome";
import { SlotSections } from "@/core/layout/PageSections";
import { useSelf } from "@/core/connection/useSelf";
import { Link } from "@/core/ui/link";
import React from "react";
import { Username } from "../components/Me";
import { RecentAppsSection } from "../components/sections/RecentAppsSection";
import { useHomePageStatsQuery } from "../api/graphql";

/**
 * Team's front door: its pages are the sidebar's Overview tab; the stage is what other modules put on your home
 * (kraph: latest mentions, top priority — each behind its own guard), then a
 * few of the organization's apps. The people are on Members.
 */
const Page: React.FC = () => {
  const { userId } = useSelf();
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
