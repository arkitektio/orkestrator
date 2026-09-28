import { Explainer } from "@/core/layout/Explainer";
import { PageLayout } from "@/core/layout/PageLayout";
import { DialogButton } from "@/core/ui/dialog-button";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { PlusIcon } from "lucide-react";
import React from "react";
import LayerList from "../components/lists/LayerList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout
      title="Layers"
      pageActions={
        <>
          <DialogButton
            alwaysShow
            name="createserviceinstance"
            variant={"outline"}
            size={"sm"}
            dialogProps={{}}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Layer
          </DialogButton>
        </>
      }
    >
      <Explainer
        title="Layers"
        description="Layers represent connection layers between services and apps. If services are defined within a specific layer, only apps that have access to that layer can access the service."
      />
      <LayerList />

      <Separator />
    </PageLayout>
  );
};

export default Page;
