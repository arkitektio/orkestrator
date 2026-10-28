import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { ResponsiveContainerGrid } from "@/core/layout/ContainerGrid";
import { Card } from "@/core/ui/card";
import { KabinetResource } from "@/core/linkers";
import { useGetResourceQuery } from "../api/graphql";
import PodCard from "../components/cards/PodCard";
import { KABINET_HELP } from "../help";

export const ResourcePage =  asDetailQueryRoute(
  useGetResourceQuery,
  ({ data }) => {
    return (
      <KabinetResource.ModelPage
        title={data?.resource?.name}
        object={data?.resource}
        help={KABINET_HELP.resource}
      >
        <div className="p-3">
          <h1 className="text-2xl font-bold tracking-tight">{data?.resource.name}</h1>
        </div>
        <div className="px-3 pb-3">
          <div className="mt-4 font-light mb-2">Hosted Pods</div>
          <div className="grid grid-cols-6 gap-2">
            {data?.resource?.pods.map((pod) => (
              <PodCard key={pod.id} item={pod} />
            ))}
          </div>
        </div>
        <div className="px-3 pb-3">
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
