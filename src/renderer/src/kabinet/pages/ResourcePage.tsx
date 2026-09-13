import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { ResponsiveContainerGrid } from "@/components/layout/ContainerGrid";
import { Card } from "@/components/ui/card";
import { KabinetResource } from "@/linkers";
import { useGetResourceQuery } from "../api/graphql";
import PodCard from "../components/cards/PodCard";

export const ResourcePage =  asDetailQueryRoute(
  useGetResourceQuery,
  ({ data }) => {
    return (
      <KabinetResource.ModelPage
        title={data?.resource?.name}
        object={data?.resource}
      >
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {data?.resource.name}
            </h1>
            <p className="mt-3 text-xl text-muted-foreground"></p>
          </div>
        </div>
        <div className="p-6">
          <div className="mt-4 font-light mb-2">Hosted Pods</div>
          <div className="grid grid-cols-6 gap-2">
            {data?.resource?.pods.map((pod) => (
              <PodCard key={pod.id} item={pod} />
            ))}
          </div>
        </div>
        <div className="p-6">
          <div className="mt-4 font-light mb-2">Qualifiers</div>
          <ResponsiveContainerGrid>
            {data?.resource?.qualifiers.map((qualifier) => (
              <Card
                key={qualifier.id}
                className="rounded-md border border-input p-4 truncate"
              >
                <h2 className="font-semibold">{qualifier.key}</h2>
                <p className="text-sm text-muted-foreground">
                  {qualifier.value}
                </p>
              </Card>
            ))}
          </ResponsiveContainerGrid>
        </div>
      </KabinetResource.ModelPage>
    );
  },
  {
    queryOptions: {
      pollInterval: 15000,
      skipPollAttempt: () => document.hidden,
    },
  },
);


export default ResourcePage;
