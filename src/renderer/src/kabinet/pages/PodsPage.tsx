import { PageLayout } from "@/core/components/layout/PageLayout";
import { Separator } from "@/core/components/ui/separator";
import React from "react";
import PodsList from "../components/lists/PodsList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout pageActions={<></>} title="Pods">
      <div className="p-3">
        <PodsList />
        <Separator className="mt-8 mb-2" />
      </div>
    </PageLayout>
  );
};

export default Page;
