import { PageLayout } from "@/core/layout/PageLayout";
import { ModuleHome } from "@/core/layout/ModuleHome";
import { PageAction } from "@/core/ui/page-action";
import React from "react";
import SoloBroadcastList from "../components/lists/SoloBroadcastList";
import StreamList from "../components/lists/StreamList";
import { LOVEKIT_HELP } from "../help";

/** Lovekit's front door: its pages, then the latest streams and broadcasts. */
const Page: React.FC = () => {
  const handleCreateRoom = async () => {
    alert("Creating room");
  };

  return (
    <PageLayout
      help={LOVEKIT_HELP.home}
      title="Lovekit"
      pageActions={
        <PageAction alwaysShow onClick={handleCreateRoom} title="Create Room">
          Create Stream
        </PageAction>
      }
    >
      <ModuleHome
        moduleKey="lovekit"
        title="Lovekit"
        description="Live video: streams, broadcasts and calls."
      >
        <StreamList defaultLimit={12} />
        <SoloBroadcastList pagination={{ limit: 12 }} />
      </ModuleHome>
    </PageLayout>
  );
};

export default Page;
