import { PageLayout } from "@/core/layout/PageLayout";
import React from "react";
import RunList from "../components/lists/RunList";
import RunCarousel from "../edit/carousels/RunCarousel";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout
      title="Runs"
      pageActions={<></>}
    >
      <RunCarousel />
      <div className="p-6">
        <RunList pagination={{ limit: 30 }} />
      </div>
    </PageLayout>
  );
};

export default Page;
