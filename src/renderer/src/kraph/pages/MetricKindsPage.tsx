import { Card } from "@/components/ui/card";
import { DialogButton } from "@/components/ui/dialog-button";
import { KraphGraph, KraphMetricKind } from "@/linkers";
import { PlusIcon } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import MetricKindList from "../components/lists/MetricKindList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const navigate = useNavigate();

  return (
    <KraphMetricKind.ListPage
      title="Metric Categories"
      pageActions={
        <>
          <DialogButton
            alwaysShow
            name="creategraph"
            variant={"outline"}
            size={"sm"}
            dialogProps={{
              onSuccess: (data) => navigate(KraphGraph.linkBuilder(data.createGraph.id)),
            }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create
          </DialogButton>
        </>
      }
    >
      <div className="p-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center mb-4">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Your metric categories
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              Metrics represent the measurements that are taken in your
              experiments, and they are always attached to your structures (e.g.
              to your ROI), that actually measured the metric.
            </p>
          </div>
          <Card className="w-full h-full flex-row relative"></Card>
        </div>

        <MetricKindList pagination={{ limit: 30 }} />
      </div>
    </KraphMetricKind.ListPage>
  );
};

export default Page;
