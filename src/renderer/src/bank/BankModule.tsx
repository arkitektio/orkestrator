import { ServiceUnavailable } from "@/core/layout/fallbacks/ServiceUnavailable";
import { ModuleLayout } from "@/core/layout/ModuleLayout";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { BankGuard } from "./api/funcs";
import AccountPage from "./pages/AccountPage";
import AccountsPage from "./pages/AccountsPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import BudgetPage from "./pages/BudgetPage";
import BudgetsPage from "./pages/BudgetsPage";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryPage from "./pages/CategoryPage";
import ConnectionPage from "./pages/ConnectionPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import HomePage from "./pages/HomePage";
import PortfolioPage from "./pages/PortfolioPage";
import RecurringPage from "./pages/RecurringPage";
import RecurringPaymentPage from "./pages/RecurringPaymentPage";
import RulePage from "./pages/RulePage";
import RulesPage from "./pages/RulesPage";
import TransactionPage from "./pages/TransactionPage";
import TransactionsPage from "./pages/TransactionsPage";
import StandardPane from "./panes/StandardPane";

export const BankModule: React.FC = () => (
  <BankGuard fallback={<ServiceUnavailable serviceKey="bank" />}>
    <ModuleLayout pane={<StandardPane />}>
      <Routes>
        {/* Where `orkestrator://bank/auth/callback?code&state` lands (coord relay). */}
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="accounts/:id" element={<AccountPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="transactions/:id" element={<TransactionPage />} />
        <Route path="connections" element={<ConnectionsPage />} />
        <Route path="connections/:id" element={<ConnectionPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="categories/:id" element={<CategoryPage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="rules/:id" element={<RulePage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="budgets/:id" element={<BudgetPage />} />
        <Route path="recurring" element={<RecurringPage />} />
        <Route path="recurring/:id" element={<RecurringPaymentPage />} />
        <Route index element={<HomePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ModuleLayout>
  </BankGuard>
);

export default BankModule;
