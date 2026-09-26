import type { NavLinkDecl } from "@/core/modules/host/define";

/**
 * bank's pages, for the ⌘K palette (a `navLinks` builtin). Mirrors the links
 * its rail pane renders; `routeCatalog.test.ts` fails when they drift.
 */
export const BANK_NAV_LINKS: NavLinkDecl[] = [
  { label: "Overview", route: "/bank", keywords: ["finance", "money", "dashboard"] },
  { label: "Insights", route: "/bank/insights", keywords: ["stats", "analysis", "compare", "trends", "savings"] },
  { label: "Accounts", route: "/bank/accounts", keywords: ["balance"] },
  { label: "Transactions", route: "/bank/transactions", keywords: ["payments", "statement"] },
  { label: "Merchants", route: "/bank/merchants", keywords: ["shops", "stores", "map"] },
  { label: "Places", route: "/bank/places", keywords: ["stores", "addresses", "locations", "map"] },
  { label: "Top merchants", route: "/bank/merchants/top", keywords: ["spending", "where", "shops"] },
  { label: "Discover", route: "/bank/merchants/discover", keywords: ["merchants", "unrecognized", "candidates", "new"] },
  { label: "Portfolio", route: "/bank/portfolio", keywords: ["depot", "scalable", "stocks", "etf", "holdings"] },
  { label: "Budgets", route: "/bank/budgets", keywords: ["spending", "limit"] },
  { label: "Categories", route: "/bank/categories", keywords: ["tags"] },
  { label: "Rules", route: "/bank/rules", keywords: ["categorize", "automatic"] },
  { label: "Recurring", route: "/bank/recurring", keywords: ["subscriptions", "rent", "salary"] },
  { label: "Connections", route: "/bank/connections", keywords: ["link", "consent", "banks"] },
];
