import { PageLayout } from "@/core/layout/PageLayout";
import { Separator } from "@/core/ui/separator";
import React from "react";
import PodsList from "../components/lists/PodsList";
import { KABINET_HELP } from "../help";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout pageActions={<></>} title="Pods" help={KABINET_HELP.pods}>
      <div className="p-3">
        <PodsList />
        <Separator className="mt-8 mb-2" />
      </div>
    </PageLayout>
  );
};

export default Page;
