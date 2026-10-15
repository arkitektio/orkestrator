import { HomeSection } from "@/core/layout/ModuleHome";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppStoreQuery } from "../../api/graphql";
import { AppShelfTile } from "../store/AppStoreCard";
import { groupApps } from "../store/storeModel";

/** How many apps the home page shows; the App Store has the rest. */
const SHOWN = 8;

/**
 * A taste of the App Store: its newest apps, as the store's own shelf tiles.
 * Same query and variables as the store page, so opening the store after
 * this costs nothing. No apps draws nothing (the empty note says what to do).
 */
export const StoreShelf = () => {
  const { data } = useAppStoreQuery({ fetchPolicy: "cache-and-network" });
  // `releases` come newest first, and so do the apps grouped from them.
  const apps = useMemo(() => groupApps(data?.releases ?? []).slice(0, SHOWN), [data]);
  if (apps.length === 0) return null;

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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-1">
        {apps.map((app) => (
          <AppShelfTile key={app.identifier} app={app} />
        ))}
      </div>
    </HomeSection>
  );
};
