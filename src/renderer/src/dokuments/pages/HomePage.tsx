import { PageLayout } from "@/core/layout/PageLayout";
import FileList from "@/dokuments/components/lists/FileList";
import { Separator } from "@radix-ui/react-dropdown-menu";
import React from "react";
import { DOKUMENTS_HELP } from "../help";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout
      title="Dokuments"
      help={DOKUMENTS_HELP.home}
      pageActions={
        <>
        </>
      }
    >
      <Separator />
      <FileList />
    </PageLayout>
  );
};

export default Page;
