import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { ListRender } from "@/core/layout/ListRender";
import { Card, CardContent } from "@/core/ui/card";
import { Image } from "@/core/ui/image";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { LokApp } from "@/core/linkers";
import { useDetailAppQuery } from "../api/graphql";
import ReleaseCard from "../components/cards/ReleaseCard";

export const AppPage = asDetailQueryRoute(useDetailAppQuery, ({ data }) => {
  const resolve = useLokResolve();

  return (
    <LokApp.ModelPage
      object={data.app}
      pageActions={<LokApp.Actions object={data?.app} />}
      title={data?.app?.identifier}
    >
      <div className="grid grid-cols-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
          <div>
            <div className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {data.app.identifier}
            </div>
          </div>
        </div>
        <div className="col-span-2">
          <div className="p-1">
            <Card>
              <CardContent className="flex aspect-[3/2] items-center justify-center p-6 max-h-[200px]">
                {data.app.logo && (
                  <Image
                    src={resolve(data?.app?.logo.presignedUrl)}
                    className="my-auto"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ListRender array={data?.app?.releases}>
        {(item) => <ReleaseCard item={item} />}
      </ListRender>
    </LokApp.ModelPage>
  );
});


export default AppPage;
