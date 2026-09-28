import { Explainer } from "@/core/layout/Explainer";
import { PageAction } from "@/core/ui/page-action";
import { OmeroArkDataset } from "@/core/linkers";
import { PlusIcon } from "lucide-react";
import DatasetList from "../components/lists/DatasetList";



const Page = () => {

  return (
    <OmeroArkDataset.ListPage
      title="Datasets"
      pageActions={
        <>
          <PageAction alwaysShow size="sm" icon={<PlusIcon className="h-4 w-4" />}>
            New
          </PageAction>
        </>
      }
    >
      <div className="p-3">
        <Explainer
          title="Datasets"
          description="Datasets allow you to group your images and files together. Just like folders. "
        />
        <DatasetList />
      </div>
    </OmeroArkDataset.ListPage>
  );
};

export default Page;
