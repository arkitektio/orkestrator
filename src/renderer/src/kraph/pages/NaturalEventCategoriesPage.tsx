import { Card } from "@/core/components/ui/card";
import { DialogButton } from "@/core/components/ui/dialog-button";
import { KraphNaturalEventCategory } from "@/core/linkers";
import { PlusIcon } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import NaturalEventCategoryList from "../components/lists/NaturalEventCategoryList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const navigate = useNavigate();

  return (
    <KraphNaturalEventCategory.ListPage
      title="Natural Event Categories"
      pageActions={
        <>
          <DialogButton
            alwaysShow
            name="createnaturaleventcategory"
            variant={"outline"}
            size={"sm"}
            dialogProps={{
              onSuccess: (data) => navigate(KraphNaturalEventCategory.linkBuilder(data.createNaturalEventCategory.id)),
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
              Your Natural Events
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              Natural events represent the events that happen during your
              experiments. Instead of protocol events, they are happening without
              external control (intrinsic events). They allow you to track cell
              lineages, births and deaths, and other events that are  measurable
              during your eperiments.
            </p>
          </div>
          <Card className="w-full h-full flex-row relative"></Card>
        </div>

        <NaturalEventCategoryList pagination={{ limit: 30 }} />
      </div>
    </KraphNaturalEventCategory.ListPage>
  );
};

export default Page;
