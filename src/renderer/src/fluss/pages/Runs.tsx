import { PageLayout } from "@/core/layout/PageLayout";
import React from "react";
import RunList from "../components/lists/RunList";
import RunCarousel from "../edit/carousels/RunCarousel";
import { FLUSS_HELP } from "../help";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout
      title="Runs"
      help={FLUSS_HELP.runs}
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
