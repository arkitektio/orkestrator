import { PageLayout } from "@/core/layout/PageLayout";
import { Card } from "@/core/ui/card";
import { DialogButton } from "@/core/ui/dialog-button";
import { KraphGraph } from "@/core/linkers";
import { PlusIcon } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import GraphList from "../components/lists/GraphList";
import { KRAPH_HELP } from "../help";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const navigate = useNavigate();

  return (
    <PageLayout
      help={KRAPH_HELP.graphs}
      title="Views"
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
              Your views
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              A view draws what your organization has claimed, as one way of
              reading it. Rules decide which words it draws and whose claims
              count; the claims stay in the log whichever view you read them through.
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
