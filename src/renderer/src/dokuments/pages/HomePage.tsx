import { PageLayout } from "@/core/components/layout/PageLayout";
import FileList from "@/dokuments/components/lists/FileList";
import { Separator } from "@radix-ui/react-dropdown-menu";
import React from "react";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout
      title="Dokuments"
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
