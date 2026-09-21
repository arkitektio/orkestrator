import { Explainer } from "@/components/explainer/Explainer";
import { PageAction } from "@/components/ui/page-action";
import { ElektroExperiment } from "@/linkers";
import { UploadIcon } from "lucide-react";
import React from "react";
import ExperimentList from "../components/lists/ExperimentList";

export type IRepresentationScreenProps = {};

const ImagesPage: React.FC<IRepresentationScreenProps> = () => {
  return (
    <ElektroExperiment.ListPage
      title="Images"
      pageActions={
        <>
          <ElektroExperiment.NewButton alwaysShow collapse="icon">
            <PageAction size="sm" icon={<UploadIcon className="h-4 w-4" />}>
              New
            </PageAction>
          </ElektroExperiment.NewButton>
        </>
      }
    >
      <div className="p-3">
        <Explainer
          title="Experiments"
          description="Experiments are plots combining the results of various simulations (i.e. comparing the soma traces of various models) "
        />
        <ExperimentList defaultLimit={30} />
      </div>
    </ElektroExperiment.ListPage>
  );
};

export default ImagesPage;
