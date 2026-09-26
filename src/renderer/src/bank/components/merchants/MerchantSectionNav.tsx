import { Badge } from "@/core/ui/badge";
import { cn } from "@/core/util/utils";
import { NavLink, useLocation } from "react-router-dom";
import { useMerchantCandidatesQuery } from "../../api/graphql";

const TABS = [
  { to: "/bank/merchants", label: "Map", end: true, view: "map" },
  { to: "/bank/merchants?view=list", label: "List", end: true, view: "list" },
  { to: "/bank/places", label: "Places", end: false },
  { to: "/bank/merchants/top", label: "Top", end: false },
  { to: "/bank/merchants/discover", label: "Discover", end: false },
] as const;

/**
 * The merchant pages as one row of tabs, so the map, the lists, the ranking
 * and the discovery queue are always a click apart. Discover shows how many
 * candidates wait.
 */
export const MerchantSectionNav = ({ className }: { className?: string }) => {
  const location = useLocation();
  const { data } = useMerchantCandidatesQuery({ fetchPolicy: "cache-first" });
  const waiting = data?.merchantCandidates.length ?? 0;
  const listView = new URLSearchParams(location.search).get("view") === "list";

  return (
    <nav className={cn("flex w-fit items-center gap-1 rounded-md bg-muted p-1 text-sm", className)}>
      {TABS.map((tab) => {
        const onMerchants = location.pathname === "/bank/merchants";
        const active =
          "view" in tab
            ? onMerchants && (tab.view === "list") === listView
            : location.pathname.startsWith(tab.to);
        return (
          <NavLink
            key={tab.label}
            to={tab.to}
            className={cn(
              "flex items-center gap-1.5 rounded px-3 py-1 text-muted-foreground hover:text-foreground",
              active && "bg-background text-foreground shadow-sm",
            )}
          >
            {tab.label}
            {tab.label === "Discover" && waiting > 0 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                {waiting}
              </Badge>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};
