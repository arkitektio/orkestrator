import { Explainer } from "@/components/explainer/Explainer";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageAction } from "@/components/ui/page-action";
import { AlpakaCollection } from "@/linkers";
import { UploadIcon } from "lucide-react";
import React from "react";
import CollectionList from "../components/lists/CollectionList";

export type IRepresentationScreenProps = {};

const CollectionsPage: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout
      title="Collections"
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
        <CollectionList pagination={{ limit: 30 }} />
      </div>
    </PageLayout>
  );
};

export default CollectionsPage;
