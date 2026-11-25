import { ModuleLayout } from "@/core/layout/ModuleLayout";
import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import DocumentPage from "./pages/DocumentPage";
import FilePage from "./pages/FilePage";
import HomePage from "./pages/HomePage";
import PagePage from "./pages/PagePage";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
import DocumentsPage from "./pages/DocumentsPage";
import FilesPage from "./pages/FilesPage";
interface Props { }

export const Module: React.FC<Props> = (_props) => {
  return (
    <ModuleLayout>
      <Routes>
        <Route path="files/:id" element={<FilePage />} />
        <Route path="pages/:id" element={<PagePage />} />
        <Route path="documents/:id" element={<DocumentPage />} />
        <Route index element={<HomePage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="files" element={<FilesPage />} />
        {/* Pages belong to a document. */}
        <Route path="pages" element={<Navigate to="../documents" relative="path" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ModuleLayout>
  );
};

export default Module;
