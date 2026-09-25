import { PageLayout } from "@/core/layout/PageLayout";
import React from "react";
import WorkspaceList from "../components/lists/WorkspaceList";
import WorkspaceCarousel from "../edit/carousels/WorkspaceCarousel";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout
      title="Workspaces"
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
