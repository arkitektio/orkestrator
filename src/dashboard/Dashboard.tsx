import { useDatalayer } from "@jhnnsrs/datalayer";
import { ResponsiveContainerGrid } from "../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../floating/utils";
import { OptimizedImage } from "../layout/OptimizedImage";
import { useDashboardQueryQuery } from "../mikro/api/graphql";
import { withMikro } from "../mikro/MikroContext";

export const Dashboard = (id: string) => {
  const {data} = withMikro(useDashboardQueryQuery)({variables: {id}});
  const { s3resolve} = useDatalayer()

  return (
    <>
    {data?.stage?.name}
    <ResponsiveContainerGrid>
      {data?.stage?.positions?.filter(notEmpty).map((position, index) => {
        let firstOmero = position.omeros?.at(0)
        let firstThumbnail = firstOmero?.representation?.latestThumbnail



        return <div key={index} className="h-30 w-30">
          {position.x}
          {position.y}
          {firstThumbnail?.image && <OptimizedImage src={s3resolve(firstThumbnail.image)} />}



          </div>

      }
      )}
    </ResponsiveContainerGrid>



    </>
  )
};
