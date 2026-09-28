import { PageAction } from "@/core/ui/page-action";
import { MikroFile } from "@/core/linkers";
import { UploadIcon } from "lucide-react";
import React from "react";
import FileList from "../components/lists/FileList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <MikroFile.ListPage
      title="Datasets"
      pageActions={
        <>
          <PageAction alwaysShow size="sm" icon={<UploadIcon className="h-4 w-4" />}>
            Upload
          </PageAction>
        </>
      }
    >
      <FileList defaultLimit={30} />
    </MikroFile.ListPage>
  );
};

export default Page;
