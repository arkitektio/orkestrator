import { ModuleLayout } from "@/core/layout/ModuleLayout";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
import React from "react";
import { Route, Routes } from "react-router-dom";
import AccountPage from "./pages/AccountPage";
import AccountsPage from "./pages/AccountsPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import BudgetPage from "./pages/BudgetPage";
import BudgetsPage from "./pages/BudgetsPage";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryPage from "./pages/CategoryPage";
import ConnectionPage from "./pages/ConnectionPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import DiscoverMerchantsPage from "./pages/DiscoverMerchantsPage";
import HomePage from "./pages/HomePage";
import InsightsPage from "./pages/InsightsPage";
import MerchantPage from "./pages/MerchantPage";
import MerchantsPage from "./pages/MerchantsPage";
import PlacePage from "./pages/PlacePage";
import PlacesPage from "./pages/PlacesPage";
import PortfolioPage from "./pages/PortfolioPage";
import RecurringPage from "./pages/RecurringPage";
import RecurringPaymentPage from "./pages/RecurringPaymentPage";
import RulePage from "./pages/RulePage";
import RulesPage from "./pages/RulesPage";
import TopMerchantsPage from "./pages/TopMerchantsPage";
import TransactionPage from "./pages/TransactionPage";
import TransactionsPage from "./pages/TransactionsPage";

export const BankModule: React.FC = () => (
  <ModuleLayout>
    <Routes>
      {/* Where `orkestrator://bank/auth/callback?code&state` lands (coord relay). */}
      <Route path="auth/callback" element={<AuthCallbackPage />} />
      <Route path="insights" element={<InsightsPage />} />
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
      <Route path="merchants" element={<MerchantsPage />} />
      <Route path="merchants/top" element={<TopMerchantsPage />} />
      <Route path="merchants/discover" element={<DiscoverMerchantsPage />} />
      <Route path="merchants/:id" element={<MerchantPage />} />
      <Route path="places" element={<PlacesPage />} />
      <Route path="places/:id" element={<PlacePage />} />
      <Route path="portfolio" element={<PortfolioPage />} />
      <Route path="budgets" element={<BudgetsPage />} />
      <Route path="budgets/:id" element={<BudgetPage />} />
      <Route path="recurring" element={<RecurringPage />} />
      <Route path="recurring/:id" element={<RecurringPaymentPage />} />
      <Route index element={<HomePage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </ModuleLayout>
);

export default BankModule;
