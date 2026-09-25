import { PageLayout } from "@/core/components/layout/PageLayout";
import { Card } from "@/core/components/ui/card";
import { DialogButton } from "@/core/components/ui/dialog-button";
import { KraphGraph } from "@/core/linkers";
import { PlusIcon } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import GraphList from "../components/lists/GraphList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const navigate = useNavigate();

  return (
    <PageLayout
      title="Graphs"
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
              Your Graphs
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              Graphs represent ways to organize your knowledge that you have
              extracted from your data.
            </p>
          </div>
          <Card className="w-full h-full flex-row relative"></Card>
        </div>

        <GraphList pagination={{ limit: 30 }} />
      </div>
    </PageLayout>
  );
};

export default Page;
