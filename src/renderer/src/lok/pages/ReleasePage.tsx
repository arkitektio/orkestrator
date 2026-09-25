import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { ListRender } from "@/core/components/layout/ListRender";
import { Image } from "@/core/components/ui/image";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { LokApp } from "@/core/linkers";
import { useDetailReleaseQuery } from "../api/graphql";
import ClientCard from "../components/cards/ClientCard";

export const ReleasePage = asDetailQueryRoute(useDetailReleaseQuery, ({ data }) => {
  const resolve = useLokResolve();

  return (
    <LokApp.ModelPage
      object={data.release}
      actions={<LokApp.Actions object={data?.release} />}
      title={data?.release && `${data.release.app?.identifier} ${data.release.version}`}
    >
      <div className="grid grid-cols-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
          <div>
            <div className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl flex flex-row gap-2 items-baseline">
              {data.release.app.identifier}<div className="font-light text-muted-foreground">{data.release.version}</div>
            </div>
          </div>
        </div>
        <div className="col-span-2">
          <div className="p-1">
            <div>
              <div className="flex aspect-[3/2] items-center justify-center p-6 max-h-[200px]">
                {data.release.app.logo?.presignedUrl && (
                  <Image
                    src={resolve(data?.release?.app?.logo.presignedUrl)}
                    className="my-auto"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ListRender array={data?.release?.clients} title="Clients">
        {(item) => <ClientCard item={item} />}
      </ListRender>
    </LokApp.ModelPage>
  );
});


export default ReleasePage;
