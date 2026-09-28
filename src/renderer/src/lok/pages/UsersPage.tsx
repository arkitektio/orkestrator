import { Explainer } from "@/core/layout/Explainer";
import { DialogButton } from "@/core/ui/dialog-button";
import { LokUser } from "@/core/linkers";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { PlusIcon } from "lucide-react";
import React from "react";
import UserList from "../components/lists/UserList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <LokUser.ListPage
      title="Users"
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
            New Group
          </DialogButton>
        </>
      }
    >
      <Explainer
        title="Users"
        description="Users are individuals who can access the system and perform actions based on their permissions. Here you see all users that are available within your Arkitekt Federation."
      />
      <UserList />

      <Separator />
    </LokUser.ListPage>
  );
};

export default Page;
