import { Explainer } from "@/core/components/explainer/Explainer";
import { PageLayout } from "@/core/components/layout/PageLayout";
import { DialogButton } from "@/core/components/ui/dialog-button";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { PlusIcon } from "lucide-react";
import React from "react";
import ServiceList from "../components/lists/ServiceList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout
      title="Lok"
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
            New Service
          </DialogButton>
        </>
      }
    >
      <Explainer
        title="Services"
        description="Services are the building blocks of every arkitekt server. They define data endpoints, that your apps can interact with. These as the currently available services in your federation."
      />
      <ServiceList />

      <Separator />
    </PageLayout>
  );
};

export default Page;
