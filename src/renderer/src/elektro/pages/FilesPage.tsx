import { UploadWrapper } from "@/core/datalayer/upload/wrapper";
import { Explainer } from "@/core/layout/Explainer";
import { PageAction } from "@/core/ui/page-action";
import { ElektroFile } from "@/core/linkers";
import { UploadIcon } from "lucide-react";
import React from "react";
import FileList from "../components/lists/FileList";
import { useCreateFile, useElektroBigFileUpload } from "../datalayer/useElektroBigFileUpload";
import { ELEKTRO_HELP } from "../help";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const performUpload = useElektroBigFileUpload();
  const createFile = useCreateFile();

  return (
    <ElektroFile.ListPage
      title="Files"
      help={ELEKTRO_HELP.files}
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
      {/* Dropping files from the OS uploads them; the rail's upload island
          then links to the file it became. */}
      <UploadWrapper uploadFile={performUpload} createFile={createFile}>
        <div className="p-3">
          <Explainer
            title="Files"
            description="Files are the raw big-file blobs you upload. They can be the origin of one or more traces. Drop files here to upload them."
          />
          <FileList />
        </div>
      </UploadWrapper>
    </ElektroFile.ListPage>
  );
};

export default Page;
