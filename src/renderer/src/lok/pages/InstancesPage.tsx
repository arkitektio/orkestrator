import { Explainer } from "@/components/explainer/Explainer";
import { PageLayout } from "@/components/layout/PageLayout";
import { DialogButton } from "@/components/ui/dialog-button";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { PlusIcon } from "lucide-react";
import React from "react";
import InstancesList from "../components/lists/InstancesList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout
      title="Instances"
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
            New Instance
          </DialogButton>
        </>
      }
    >
      <Explainer
        title="Instances"
        description="Services are the building blocks of every arkitekt server. They define data sources, data sinks, and allow to add in functionality that all apps can use."
      />
      <InstancesList />

      <Separator />
    </PageLayout>
  );
};

export default Page;
