import { useRegisterDashboardWidget } from "@/providers/dashboard/hooks";
import { Loader2, PlayCircle } from "lucide-react";
import { useHomePageStatsQuery as useRekuestHomePageStatsQuery } from "@/rekuest/api/graphql";

const RekuestWidget = () => {
  const { data, loading } = useRekuestHomePageStatsQuery({
    fetchPolicy: "cache-and-network",
  });

  return (
    <div>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex gap-4">
          <div>
            <p className="text-2xl font-bold">
              {data?.taskStats?.count ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Tasks</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {data?.actionStats?.count ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Actions</p>
          </div>
        </div>
      )}
    </div>
  );
};

export const RekuestDashboardWidgets = () => {
  useRegisterDashboardWidget({
    key: "rekuest-stats",
    label: "Tasks",
    module: "rekuest",
    icon: <PlayCircle className="w-3 h-3" />,
    component: () => <RekuestWidget />,
    defaultSize: "1x1",
    defaultWidth: 25,
    defaultHeight: 50,
  });

  return null;
};
