import { Card } from "@/core/components/ui/card";
import { DialogButton } from "@/core/components/ui/dialog-button";
import { KraphEntityCategory } from "@/core/linkers";
import { PlusIcon } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import EntityCategoryList from "../components/lists/EntityCategoryList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const navigate = useNavigate();

  return (
    <KraphEntityCategory.ListPage
      title="Entity Categories"
      pageActions={
        <>
          <DialogButton
            alwaysShow
            name="createentitycategory"
            variant={"outline"}
            size={"sm"}
            dialogProps={{
              onSuccess: (data) => navigate(KraphEntityCategory.linkBuilder(data.createEntityCategory.id)),
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
              Your Entity categories
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              Entities represent the objects of your experiments. They are
              measured in the graph and are the main focus of your analysis.
              They can be anything from genes, proteins, cells, or any other
              biological entity. What ever you can measure, you can represent as
              an entity.
              <br />
            </p>
          </div>
          <Card className="w-full h-full flex-row relative"></Card>
        </div>

        <EntityCategoryList pagination={{ limit: 30 }} />
      </div>
    </KraphEntityCategory.ListPage>
  );
};

export default Page;
