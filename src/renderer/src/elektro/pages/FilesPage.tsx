import { Explainer } from "@/core/layout/Explainer";
import { PageAction } from "@/core/ui/page-action";
import { ElektroFile } from "@/core/linkers";
import { UploadIcon } from "lucide-react";
import React from "react";
import FileList from "../components/lists/FileList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <ElektroFile.ListPage
      title="Files"
      pageActions={
        <>
          <ElektroFile.NewButton alwaysShow collapse="icon">
            <PageAction size="sm" icon={<UploadIcon className="h-4 w-4" />}>
              Upload
            </PageAction>
          </ElektroFile.NewButton>
        </>
      }
    >
      <div className="p-3">
        <Explainer
          title="Files"
          description="Files are the raw big-file blobs you upload. They can be the origin of one or more traces."
        />
        <FileList />
      </div>
    </ElektroFile.ListPage>
  );
};

export default Page;
