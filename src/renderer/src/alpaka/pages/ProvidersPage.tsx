import { FormSheet } from "@/core/components/dialog/FormDialog";
import { Explainer } from "@/core/components/explainer/Explainer";
import { PageLayout } from "@/core/components/layout/PageLayout";
import { PageAction } from "@/core/components/ui/page-action";
import { AlpakaProvider } from "@/core/linkers";
import { UploadIcon } from "lucide-react";
import React from "react";
import ProviderList from "../components/lists/ProviderList";
import CreateProviderForm from "../forms/CreateProviderForm";

export type IRepresentationScreenProps = {};

const ImagesPage: React.FC<IRepresentationScreenProps> = () => {
  return (
    <PageLayout
      title="Providers"
      pageActions={
        <>
          <AlpakaProvider.NewButton alwaysShow collapse="icon">
            <PageAction size="sm" icon={<UploadIcon className="h-4 w-4" />}>
              New
            </PageAction>
          </AlpakaProvider.NewButton>

          <FormSheet trigger={<PageAction>New Provider</PageAction>}>
            <CreateProviderForm />
          </FormSheet>
        </>
      }
    >
      <div className="p-3">
        <Explainer
          title="Providers"
          description="Providers are source for LLM models"
        />
        <ProviderList pagination={{ limit: 30 }} />
      </div>
    </PageLayout>
  );
};

export default ImagesPage;
