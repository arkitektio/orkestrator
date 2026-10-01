import { PageLayout } from "@/core/layout/PageLayout";
import React from "react";
import WorkspaceList from "../components/lists/WorkspaceList";
import WorkspaceCarousel from "../edit/carousels/WorkspaceCarousel";
import { FLUSS_HELP } from "../help";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout
      title="Workspaces"
      help={FLUSS_HELP.workspaces}
      pageActions={<></>}
    >
      <WorkspaceCarousel />
      <div className="p-6">
        <WorkspaceList pagination={{ limit: 30 }} />
      </div>
    </PageLayout>
  );
};

export default Page;
