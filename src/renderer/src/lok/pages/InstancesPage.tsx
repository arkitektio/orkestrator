import { Explainer } from "@/core/layout/Explainer";
import { LOK_HELP } from "../help";
import { PageLayout } from "@/core/layout/PageLayout";
import { DialogButton } from "@/core/ui/dialog-button";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { PlusIcon } from "lucide-react";
import React from "react";
import InstancesList from "../components/lists/InstancesList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout
      help={LOK_HELP.instances}
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
