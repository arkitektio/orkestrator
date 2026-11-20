import { HomeSection } from "@/core/layout/ModuleHome";
import { Badge } from "@/core/ui/badge";
import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppStoreQuery } from "../../api/graphql";
import { AppStoreCard } from "../store/AppStoreCard";
import { FeaturedApp } from "../store/FeaturedApp";
import { groupApps } from "../store/storeModel";

/** How many apps follow the newest one; the App Store has the rest. */
const SHOWN = 6;

/**
 * A taste of the App Store: the newest app you do not have yet, portrayed
 * large, then the next ones as the store's own cards. Installed apps are
 * left to "Your apps" above. Same query and variables as the store page, so
 * opening the store after this costs nothing. Nothing new draws nothing.
 */
export const StoreShelf = () => {
  const { data } = useAppStoreQuery({ fetchPolicy: "cache-and-network" });
  // `releases` come newest first, and so do the apps grouped from them.
  const [newest, ...rest] = useMemo(
    () =>
      groupApps(data?.releases ?? [])
        .filter((app) => app.deploymentCount === 0)
        .slice(0, SHOWN + 1),
    [data],
  );
  if (!newest) return null;

  return (
    <HomeSection
      title={
        <span className="flex w-full items-center justify-between">
          Fresh in the App Store
          <Link
            to="/kabinet/app-store"
            className="text-[11px] font-normal normal-case tracking-normal hover:text-foreground"
          >
            Open App Store →
          </Link>
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        <FeaturedApp
          app={newest}
          badge={
            <Badge className="w-fit gap-1 rounded-full bg-primary/10 text-primary hover:bg-primary/10">
              <Sparkles className="size-3" />
              Newest
            </Badge>
          }
        />
        {rest.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
            {rest.map((app) => (
              <AppStoreCard key={app.identifier} app={app} />
            ))}
          </div>
        )}
      </div>
    </HomeSection>
  );
};
