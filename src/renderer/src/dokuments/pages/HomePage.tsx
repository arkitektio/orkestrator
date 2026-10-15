import { PageLayout } from "@/core/layout/PageLayout";
import { ModuleHome } from "@/core/layout/ModuleHome";
import DocumentList from "@/dokuments/components/lists/DocumentList";
import FileList from "@/dokuments/components/lists/FileList";
import React from "react";
import { DOKUMENTS_HELP } from "../help";

/** Dokuments' front door: its pages, then a page of documents and of files. */
const Page: React.FC = () => {
  return (
    <PageLayout title="Dokuments" help={DOKUMENTS_HELP.home}>
      <ModuleHome
        moduleKey="dokuments"
        title="Dokuments"
        description="Files such as PDFs and scans, and the documents made from them."
      >
        <DocumentList defaultLimit={12} />
        <FileList pagination={{ limit: 12 }} />
      </ModuleHome>
    </PageLayout>
  );
};

export default Page;
