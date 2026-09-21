import { Explainer } from "@/components/explainer/Explainer";
import { PageAction } from "@/components/ui/page-action";
import { ElektroModelCollection } from "@/linkers";
import { UploadIcon } from "lucide-react";
import React from "react";
import ModelCollectionList from "../components/lists/ModelCollectionList";

export type IRepresentationScreenProps = {};

const ImagesPage: React.FC<IRepresentationScreenProps> = () => {
  return (
    <ElektroModelCollection.ListPage
      title="Model Collection"
      pageActions={
        <>
          <ElektroModelCollection.NewButton alwaysShow collapse="icon">
            <PageAction size="sm" icon={<UploadIcon className="h-4 w-4" />}>
              New
            </PageAction>
          </ElektroModelCollection.NewButton>
        </>
      }
    >
      <div className="p-3">
        <Explainer
          title="Model Collections"
          description="Model collections allow you to group multiple models together. This is useful for organizing your models and sharing them with others."
        />
        <ModelCollectionList defaultLimit={30} />
      </div>
    </ElektroModelCollection.ListPage>
  );
};

export default ImagesPage;
