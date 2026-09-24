import { useRegisterDashboardWidget } from "../hooks";
import { Boxes, Loader2 } from "lucide-react";
import {
  useGetArrayDatasetsQuery,
  Ordering,
} from "@/mikro-next/api/graphql";
import { Image } from "@/components/ui/image";
import { useResolve } from "@/datalayer/hooks/useResolve";
import { MikroArrayDataset } from "@/linkers";
import { Card } from "@/components/ui/card";

const LatestArrayDatasetsWidget = () => {
  const resolve = useResolve();
  const { data, loading } = useGetArrayDatasetsQuery({
    variables: {
      pagination: { limit: 8 },
      ordering: [{ createdAt: Ordering.Desc }],
    },
    fetchPolicy: "cache-and-network",
  });

  const datasets = data?.arrayDatasets ?? [];

  return (
    <div className="flex flex-col h-full">
      {loading && datasets.length === 0 ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : datasets.length === 0 ? (
        <p className="text-xs text-muted-foreground">No datasets yet</p>
      ) : (
        // Columns answer to the widget panel's `@container`, never to how many
        // datasets came back: square snapshot tiles start at two per row, so
        // a narrow panel does not stack eight full-width squares.
        <div
          className="grid grid-cols-2 gap-2 @xs:grid-cols-3 @md:grid-cols-4 @2xl:grid-cols-6 @4xl:grid-cols-8 [&>*:first-child]:@md:col-span-2 [&>*:first-child]:@md:row-span-2"
          data-enableselect="true"
        >
            {datasets.map((dataset) => (
              <MikroArrayDataset.Smart key={dataset.id} object={dataset}>
                <MikroArrayDataset.DetailLink
                  object={dataset}
                  className={() => "block cursor-pointer group"}
                >
                  <Card className="relative aspect-square rounded-md overflow-hidden bg-muted h-full">
                    {dataset.latestSnapshot?.store.key ? (
                      <Image
                        src={resolve(dataset.latestSnapshot.store.key)}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <Boxes className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[9px] text-white truncate">
                        {dataset.name}
                      </p>
                    </div>
                  </Card>
                </MikroArrayDataset.DetailLink>
              </MikroArrayDataset.Smart>
            ))}
        </div>
      )}
    </div>
  );
};

export const LatestArrayDatasetsDashboardWidget = () => {
  useRegisterDashboardWidget({
    key: "latest-arrayDatasets",
    label: "Latest Datasets",
    module: "mikro",
    icon: <Boxes className="w-3 h-3" />,
    component: () => <LatestArrayDatasetsWidget />,
    defaultSize: "2x2",
    defaultWidth: 50,
    defaultHeight: 100,
  });

  return null;
};
