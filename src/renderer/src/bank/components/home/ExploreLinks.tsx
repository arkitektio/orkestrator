import { Badge } from "@/core/ui/badge";
import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  Landmark,
  LineChart,
  ListChecks,
  LucideIcon,
  MapPin,
  PiggyBank,
  Repeat,
  Sparkles,
  Store,
  Tags,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";

type Tile = { to: string; label: string; icon: LucideIcon; count?: number; hidden?: boolean };

/**
 * Every part of the bank module, one click from the overview. A tile carries a
 * count only where there is something waiting there.
 */
export const ExploreLinks = ({
  uncategorized = 0,
  discover = 0,
  hasDepot = false,
}: {
  uncategorized?: number;
  discover?: number;
  hasDepot?: boolean;
}) => {
  const tiles: Tile[] = [
    { to: "/bank/insights", label: "Insights", icon: ChartNoAxesCombined },
    { to: "/bank/transactions", label: "Transactions", icon: ArrowLeftRight, count: uncategorized },
    { to: "/bank/merchants", label: "Merchants", icon: Store },
    { to: "/bank/places", label: "Places", icon: MapPin },
    { to: "/bank/merchants/top", label: "Top merchants", icon: Trophy },
    { to: "/bank/merchants/discover", label: "Discover", icon: Sparkles, count: discover },
    { to: "/bank/categories", label: "Categories", icon: Tags },
    { to: "/bank/budgets", label: "Budgets", icon: PiggyBank },
    { to: "/bank/rules", label: "Rules", icon: ListChecks },
    { to: "/bank/recurring", label: "Recurring", icon: Repeat },
    { to: "/bank/portfolio", label: "Portfolio", icon: LineChart, hidden: !hasDepot },
    { to: "/bank/connections", label: "Connections", icon: Landmark },
  ];

  return (
    <nav className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
      {tiles
        .filter((tile) => !tile.hidden)
        .map(({ to, label, icon: Icon, count }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{label}</span>
            {!!count && (
              <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px] tabular-nums">
                {count}
              </Badge>
            )}
          </Link>
        ))}
    </nav>
  );
};
