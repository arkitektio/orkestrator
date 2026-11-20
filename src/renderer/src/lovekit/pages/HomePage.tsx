import { PageLayout } from "@/core/layout/PageLayout";
import { ModuleHome, ModuleHomeSidebars } from "@/core/layout/ModuleHome";
import React from "react";
import StreamList from "../components/lists/StreamList";
import { LOVEKIT_HELP } from "../help";

/** Lovekit's front door: the streams the organization's apps offer. */
const Page: React.FC = () => {
  return (
    <PageLayout
      help={LOVEKIT_HELP.home}
      title="Lovekit"
      sidebars={<ModuleHomeSidebars moduleKey="lovekit" />}
    >
      <ModuleHome
        moduleKey="lovekit"
        pages={false}
        title="Lovekit"
        description="Live video: the streams apps offer, and calls."
      >
        <StreamList defaultLimit={12} />
      </ModuleHome>
    </PageLayout>
  );
};

export default Page;
