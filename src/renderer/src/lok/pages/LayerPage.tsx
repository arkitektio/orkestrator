import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Card, CardContent } from "@/core/ui/card";
import { Image } from "@/core/ui/image";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { LokLayer } from "@/core/linkers";
import {
  useDetailLayerQuery
} from "../api/graphql";

export const LayerPage = asDetailQueryRoute(useDetailLayerQuery, ({ data }) => {
  const resolve = useLokResolve();

  return (
    <LokLayer.ModelPage
      object={data.layer}
      actions={<LokLayer.Actions object={data?.layer} />}
      title={data?.layer?.name}
      sidebars={<LokLayer.Knowledge object={data?.layer} />}
    >
      <div className="grid grid-cols-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
          <div>
            <div className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {data.layer.name}
            </div>
          </div>
        </div>
        <div className="col-span-2">
          <div className="p-1">
            <Card>
              <CardContent className="flex aspect-[3/2] items-center justify-center p-6 max-h-[200px]">
                {data.layer?.logo?.presignedUrl && (
                  <Image
                    src={resolve(data?.layer?.logo?.presignedUrl)}
                    className="my-auto"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </LokLayer.ModelPage>
  );
});


export default LayerPage;
