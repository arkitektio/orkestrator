import { Explainer } from "@/components/explainer/Explainer";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageAction } from "@/components/ui/page-action";
import { AlpakaLLMModel } from "@/linkers";
import { UploadIcon } from "lucide-react";
import React from "react";
import LLMModelList from "../components/lists/LLMModelList";

export type IRepresentationScreenProps = {};

const LLMModelsPage: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout
      title="LLM Models"
      pageActions={
        <>
          <AlpakaLLMModel.NewButton alwaysShow collapse="icon">
            <PageAction size="sm" icon={<UploadIcon className="h-4 w-4" />}>
              New
            </PageAction>
          </AlpakaLLMModel.NewButton>
        </>
      }
    >
      <div className="p-3">
        <Explainer
          title="LLM Models"
          description="Large language models to chat with."
        />
        <LLMModelList pagination={{ limit: 30 }} />
      </div>
    </PageLayout>
  );
};

export default LLMModelsPage;
