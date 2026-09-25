import { Explainer } from "@/core/components/explainer/Explainer";
import { PageAction } from "@/core/components/ui/page-action";
import { MikroFolder } from "@/core/linkers";
import { PlusIcon } from "lucide-react";
import React from "react";
import { GetFoldersDocument, useCreateFolderMutation } from "../api/graphql";
import FolderList from "../components/lists/FolderList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const [createFolder] = useCreateFolderMutation({
    variables: {
      input: { name: "New Folder" }
    },
    refetchQueries: [GetFoldersDocument]
  });

  return (
    <MikroFolder.ListPage
      title="Folders"
      pageActions={
        <>
          <PageAction
            alwaysShow
            size="sm"
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => createFolder()}
          >
            New
          </PageAction>
        </>
      }
    >
      <div className="p-3">
        <Explainer
          title="Folders"
          description="Folders group your datasets and files together, just like folders in a file system."
        />
        <FolderList defaultLimit={30} filters={{ parentless: true }} />
      </div>
    </MikroFolder.ListPage>
  );
};

export default Page;
