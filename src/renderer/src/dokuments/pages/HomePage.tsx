import { PageLayout } from "@/core/layout/PageLayout";
import { ModuleHome, ModuleHomeSidebars } from "@/core/layout/ModuleHome";
import DocumentList from "@/dokuments/components/lists/DocumentList";
import FileList from "@/dokuments/components/lists/FileList";
import React from "react";
import { DOKUMENTS_HELP } from "../help";

/** Dokuments' front door: a page of documents and of files; its pages are the sidebar's Overview tab. */
const Page: React.FC = () => {
  return (
    <PageLayout
      title="Dokuments"
      help={DOKUMENTS_HELP.home}
      sidebars={<ModuleHomeSidebars moduleKey="dokuments" />}
    >
      <ModuleHome
        moduleKey="dokuments"
        pages={false}
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
