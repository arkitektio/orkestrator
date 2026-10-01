import { PageLayout } from "@/core/layout/PageLayout";
import { PageAction } from "@/core/ui/page-action";
import { Separator } from "@radix-ui/react-dropdown-menu";
import React from "react";
import { LOVEKIT_HELP } from "../help";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const handleCreateRoom = async () => {
    alert("Creating room");
  };

  return (
    <PageLayout
      help={LOVEKIT_HELP.home}
      title="Lovekit"
      pageActions={
        <>
          <PageAction alwaysShow onClick={handleCreateRoom} title="Create Room">
            Create Stream
          </PageAction>
        </>
      }
    >
      <Separator />
    </PageLayout>
  );
};

export default Page;
