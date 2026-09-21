import { PageLayout } from "@/components/layout/PageLayout";
import { PageAction } from "@/components/ui/page-action";
import { Separator } from "@radix-ui/react-dropdown-menu";
import React from "react";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const handleCreateRoom = async () => {
    alert("Creating room");
  };

  return (
    <PageLayout
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
