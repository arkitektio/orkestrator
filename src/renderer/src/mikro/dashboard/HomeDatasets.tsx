import { useResolve } from "@/core/datalayer/hooks/useResolve";
import { HomeSection } from "@/core/layout/ModuleHome";
import { MikroArrayDataset } from "@/core/linkers";
import { Card } from "@/core/ui/card";
import { Image } from "@/core/ui/image";
import { Boxes } from "lucide-react";
import { Ordering, useGetArrayDatasetsQuery } from "../api/graphql";

/** A row of tiles on a wide page; the list page has the rest. */
const SHOWN = 10;

/**
 * The newest array datasets, as snapshot tiles, on the home page (mikro's
 * `home` slot section). Nothing while there are none.
 */
export const HomeDatasets = () => {
  const resolve = useResolve();
  const { data } = useGetArrayDatasetsQuery({
    variables: { pagination: { limit: SHOWN }, ordering: [{ createdAt: Ordering.Desc }] },
    fetchPolicy: "cache-and-network",
  });
  const datasets = data?.arrayDatasets ?? [];
  if (datasets.length === 0) return null;

  return (
    <HomeSection
      title={
        <>
          <span>Latest datasets</span>
          <MikroArrayDataset.ListLink className="ml-auto font-normal normal-case tracking-normal hover:text-foreground">
            All datasets →
          </MikroArrayDataset.ListLink>
        </>
      }
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2" data-enableselect="true">
        {datasets.map((dataset) => (
          <MikroArrayDataset.Smart key={dataset.id} object={dataset}>
            <MikroArrayDataset.DetailLink object={dataset} className={() => "group block cursor-pointer"}>
              <Card className="relative aspect-square h-full overflow-hidden rounded-md bg-muted">
                {dataset.latestSnapshot?.store.key ? (
                  <Image src={resolve(dataset.latestSnapshot.store.key)} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Boxes className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                {/* The name is always there: a tile with no snapshot is otherwise anonymous. */}
                <div className="dark absolute inset-x-0 bottom-0 bg-background/60 px-1.5 py-1">
                  <p className="truncate text-[11px] text-foreground">{dataset.name}</p>
                </div>
              </Card>
            </MikroArrayDataset.DetailLink>
          </MikroArrayDataset.Smart>
        ))}
      </div>
    </HomeSection>
  );
};
