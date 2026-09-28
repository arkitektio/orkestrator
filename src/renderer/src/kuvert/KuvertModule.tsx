import { ServiceUnavailable } from "@/core/layout/fallbacks/ServiceUnavailable";
import { ModuleLayout } from "@/core/layout/ModuleLayout";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { KuvertGuard } from "./api/funcs";
import { MailboxSyncs } from "./components/useMailboxSyncs";
import AccountPage from "./pages/AccountPage";
import AccountsPage from "./pages/AccountsPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import FolderPage from "./pages/FolderPage";
import MessagePage from "./pages/MessagePage";
import OutboxPage from "./pages/OutboxPage";
import OutgoingPage from "./pages/OutgoingPage";
import SearchPage from "./pages/SearchPage";
import SmartMailboxPage from "./pages/SmartMailboxPage";
import ThreadPage from "./pages/ThreadPage";
import { SMART_MAILBOXES } from "./smartMailboxes";

export const KuvertModule: React.FC = () => (
  <KuvertGuard fallback={<ServiceUnavailable serviceKey="kuvert" />}>
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
  </KuvertGuard>
);

export default KuvertModule;
