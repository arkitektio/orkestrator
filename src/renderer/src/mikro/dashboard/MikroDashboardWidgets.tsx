import { useRegisterDashboardWidget } from "@/providers/dashboard/hooks";
import { Boxes, Loader2 } from "lucide-react";
import {
  useHomePageQuery as useMikroHomePageQuery,
  useHomePageStatsQuery as useMikroHomePageStatsQuery,
} from "@/mikro/api/graphql";
import { useResolve } from "@/datalayer/hooks/useResolve";

const MikroWidget = () => {
  const resolve = useResolve();
  const { data: statsData, loading: statsLoading } =
    useMikroHomePageStatsQuery({ fetchPolicy: "cache-and-network" });
  const { data: homeData } = useMikroHomePageQuery({
    fetchPolicy: "cache-and-network",
  });

  const latestDataset = homeData?.arrayDatasets?.[0];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Boxes className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Datasets</span>
      </div>
      {statsLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex gap-4 items-center">
          <div>
            <p className="text-2xl font-bold">
              {statsData?.arrayDatasetsStats?.count ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Datasets</p>
          </div>
          {latestDataset?.latestSnapshot?.store?.key && (
            <img
              src={resolve(latestDataset.latestSnapshot.store.key)}
              alt={latestDataset.name}
              className="w-10 h-10 rounded object-cover ml-auto"
            />
          )}
        </div>
      )}
    </div>
  );
};

export const MikroDashboardWidgets = () => {
  useRegisterDashboardWidget({
    key: "mikro-stats",
    label: "Datasets",
    module: "mikro",
    icon: <Boxes className="w-3 h-3" />,
    component: () => <MikroWidget />,
    defaultSize: "1x1",
    defaultWidth: 25,
    defaultHeight: 50,
  });

  return null;
};
