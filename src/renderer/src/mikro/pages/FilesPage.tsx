import { PageAction } from "@/core/ui/page-action";
import { MikroFile } from "@/core/linkers";
import { UploadIcon } from "lucide-react";
import React from "react";
import FileList from "../components/lists/FileList";
import { MIKRO_HELP } from "../help";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  return (
    <MikroFile.ListPage
      title="Datasets"
      help={MIKRO_HELP.files}
      pageActions={
        <>
          <PageAction alwaysShow size="sm" icon={<UploadIcon className="h-4 w-4" />}>
            Upload
          </PageAction>
        </>
      }
    >
      <div className="p-3">
        <FileList defaultLimit={30} />
      </div>
    </MikroFile.ListPage>
  );
};

export default Page;
