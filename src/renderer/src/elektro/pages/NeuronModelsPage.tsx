import { Explainer } from "@/core/layout/Explainer";
import { PageAction } from "@/core/ui/page-action";
import { ElektroNeuronModel } from "@/core/linkers";
import { UploadIcon } from "lucide-react";
import React from "react";
import NeuronModelList from "../components/lists/NeuronModelList";

export type IRepresentationScreenProps = {};

const ImagesPage: React.FC<IRepresentationScreenProps> = () => {
  return (
    <ElektroNeuronModel.ListPage
      title="Neuron models"
      pageActions={
        <>
          <ElektroNeuronModel.NewButton alwaysShow collapse="icon">
            <PageAction size="sm" icon={<UploadIcon className="h-4 w-4" />}>
              New
            </PageAction>
          </ElektroNeuronModel.NewButton>
        </>
      }
    >
      <div className="p-3">
        <Explainer
          title="Neuron Models"
          description="Neuron Models allow for the simulation of various neurons and their networks. They are the ingest point of simulations"
        />
        <NeuronModelList defaultLimit={30} />
      </div>
    </ElektroNeuronModel.ListPage>
  );
};

export default ImagesPage;
