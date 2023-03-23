import { useDatalayer } from "@jhnnsrs/datalayer";
import { ResponsiveContainerGrid } from "../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../floating/utils";
import { OptimizedImage } from "../layout/OptimizedImage";
import { PageLayout } from "../layout/PageLayout";
import { useDashboardQueryQuery } from "../mikro/api/graphql";
import { withMikro } from "../mikro/MikroContext";

export const Live = ({ id }: { id: string }) => {
  const { data } = withMikro(useDashboardQueryQuery)({ variables: { id } });
  const { s3resolve } = useDatalayer();

  return (
    <PageLayout>
      <div className="flex flex-grow flex-col text-white @container">
        <div className="font-light text-xl flex mr-2 text-slate-2">
          {data?.stage?.name}
        </div>
        <ResponsiveContainerGrid>
          {data?.stage?.positions?.filter(notEmpty).map((position, index) => {
            let firstOmero = position.omeros?.at(0);
            let firstThumbnail = firstOmero?.representation?.latestThumbnail;

            return (
              <div key={index} className="relative aspect-square">
                {position.x}
                {position.y}
                {firstThumbnail?.image && (
                  <OptimizedImage
                    src={s3resolve(firstThumbnail.image)}
                    style={{ filter: "brightness(0.7)" }}
                    className="object-cover h-full w-full absolute top-0 left-0 rounded"
                    blurhash={firstThumbnail.blurhash}
                  />
                )}
              </div>
            );
          })}
        </ResponsiveContainerGrid>
      </div>
    </PageLayout>
  );
};
