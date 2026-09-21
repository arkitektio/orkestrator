import { Explainer } from "@/components/explainer/Explainer";
import { PageAction } from "@/components/ui/page-action";
import { AlpakaCollection, LovekitSoloBroadcast } from "@/linkers";
import { UploadIcon } from "lucide-react";
import React from "react";
import SoloBroadcastList from "../components/lists/SoloBroadcastList";

export type IRepresentationScreenProps = {};

const ImagesPage: React.FC<IRepresentationScreenProps> = () => {
  return (
    <LovekitSoloBroadcast.ListPage
      title="Images"
      pageActions={
        <>
          <AlpakaCollection.NewButton alwaysShow collapse="icon">
            <PageAction size="sm" icon={<UploadIcon className="h-4 w-4" />}>
              New
            </PageAction>
          </AlpakaCollection.NewButton>
        </>
      }
    >
      <div className="p-3">
        <Explainer
          title="Collections"
          description="Collections are searchable groups of data. They allow to retrieve data based on semantic queries."
        />
        <SoloBroadcastList pagination={{ limit: 30 }} />
      </div>
    </LovekitSoloBroadcast.ListPage>
  );
};

export default ImagesPage;
