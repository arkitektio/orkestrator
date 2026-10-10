import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  Home,
  Landmark,
  LineChart,
  ListChecks,
  Map as MapIcon,
  MapPin,
  PiggyBank,
  Plug,
  Repeat,
  Sparkles,
  Tags,
  Trophy,
  Wallet,
} from "lucide-react";

import { ADMIN_ROLE } from "@/core/connection/roles";
import type { NavLinkDecl } from "@/core/modules/host/define";

/** bank's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const BANK_NAV_LINKS: NavLinkDecl[] = [
  { label: "Overview", route: "/bank", keywords: ["finance", "money", "dashboard"], group: "Explore", icon: Home, home: true },
  { label: "Insights", route: "/bank/insights", keywords: ["stats", "analysis", "compare", "trends", "savings"], group: "Explore", icon: ChartNoAxesCombined, description: "Trends and comparisons" },
  { label: "Accounts", route: "/bank/accounts", keywords: ["balance"], group: "Explore", icon: Wallet, description: "Balances per account" },
  { label: "Transactions", route: "/bank/transactions", keywords: ["payments", "statement"], group: "Explore", icon: ArrowLeftRight, description: "Every booking" },
  { label: "Merchants", route: "/bank/merchants", keywords: ["shops", "stores", "map"], group: "Merchants", icon: MapIcon, description: "Where you spend" },
  { label: "Places", route: "/bank/places", keywords: ["stores", "addresses", "locations", "map"], group: "Merchants", icon: MapPin, description: "Stores on a map" },
  { label: "Top merchants", route: "/bank/merchants/top", keywords: ["spending", "where", "shops"], group: "Merchants", icon: Trophy, description: "Ranked by spending" },
  { label: "Discover", route: "/bank/merchants/discover", keywords: ["merchants", "unrecognized", "candidates", "new"], group: "Merchants", icon: Sparkles, description: "Unrecognized merchants" },
  { label: "Portfolio", route: "/bank/portfolio", keywords: ["depot", "scalable", "stocks", "etf", "holdings"], group: "Explore", icon: LineChart, description: "Depots and holdings" },
  { label: "Budgets", route: "/bank/budgets", keywords: ["spending", "limit"], group: "Organize", icon: PiggyBank, description: "Spending limits" },
  { label: "Categories", route: "/bank/categories", keywords: ["tags"], group: "Organize", icon: Tags, description: "How bookings are sorted" },
  { label: "Rules", route: "/bank/rules", keywords: ["categorize", "automatic"], group: "Organize", icon: ListChecks, description: "Automatic categorizing" },
  { label: "Recurring", route: "/bank/recurring", keywords: ["subscriptions", "rent", "salary"], group: "Organize", icon: Repeat, description: "Subscriptions and salary" },
  { label: "Connections", route: "/bank/connections", keywords: ["link", "consent", "banks"], group: "Organize", icon: Landmark, description: "Linked banks" },
  { label: "Providers", route: "/bank/providers", keywords: ["enable banking", "scalable", "setup", "credentials", "psd2"], group: "Admin", icon: Plug, description: "How banks are reached", roles: ADMIN_ROLE },
];
