import { HomeSection } from "@/core/layout/ModuleHome";
import { useAppsQuery } from "@/lok/api/graphql";
import AppCard from "../cards/AppCard";

/** A handful of the organization's apps; nothing registered draws nothing. */
export const RecentAppsSection = () => {
  const { data } = useAppsQuery({
    variables: {
      pagination: { limit: 6 },
    },
  });

  const apps = data?.apps ?? [];
  if (apps.length === 0) return null;

  return (
    <HomeSection title="Recent apps">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
        {apps.map((app) => (
          <AppCard key={app.id} item={app} />
        ))}
      </div>
    </HomeSection>
  );
};
