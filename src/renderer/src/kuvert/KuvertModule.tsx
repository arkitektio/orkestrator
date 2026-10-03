import { ModuleLayout } from "@/core/layout/ModuleLayout";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { MailboxSyncs } from "./components/useMailboxSyncs";
import AccountPage from "./pages/AccountPage";
import AccountsPage from "./pages/AccountsPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import CategoryPage from "./pages/CategoryPage";
import ChangesPage from "./pages/ChangesPage";
import FolderPage from "./pages/FolderPage";
import MessagePage from "./pages/MessagePage";
import OutboxPage from "./pages/OutboxPage";
import OutgoingPage from "./pages/OutgoingPage";
import SearchPage from "./pages/SearchPage";
import SmartMailboxPage from "./pages/SmartMailboxPage";
import TaskListPage from "./pages/TaskListPage";
import TaskPage from "./pages/TaskPage";
import TasksPage from "./pages/TasksPage";
import ThreadPage from "./pages/ThreadPage";
import { SMART_MAILBOXES } from "./smartMailboxes";

export const KuvertModule: React.FC = () => (
  <>
    <MailboxSyncs />
    <ModuleLayout>
      <Routes>
        {/* Where `orkestrator://kuvert/auth/callback?code&state` lands (coord relay). */}
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="accounts/:id" element={<AccountPage />} />
        <Route path="folders/:id" element={<FolderPage />} />
        <Route path="threads/:id" element={<ThreadPage />} />
        <Route path="messages/:id" element={<MessagePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="outbox" element={<OutboxPage />} />
        <Route path="outbox/:id" element={<OutgoingPage />} />
        <Route path="categories/:id" element={<CategoryPage />} />
        <Route path="changes" element={<ChangesPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="tasks/:id" element={<TaskPage />} />
        <Route path="tasklists/:id" element={<TaskListPage />} />
        {SMART_MAILBOXES.map((mailbox) =>
          mailbox.path ? (
            <Route key={mailbox.key} path={mailbox.path} element={<SmartMailboxPage key={mailbox.key} mailbox={mailbox} />} />
          ) : (
            <Route key={mailbox.key} index element={<SmartMailboxPage key={mailbox.key} mailbox={mailbox} />} />
          ),
        )}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ModuleLayout>
  </>
);

export default KuvertModule;
