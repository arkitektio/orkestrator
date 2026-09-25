import { DisplayWidgetProps } from "@/lib/display/registry";
import { KabinetPod } from "@/linkers";
import { useGetPodQuery } from "../api/graphql";

export const PodDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetPodQuery({
    variables: {
      id: props.id,
    }
  });

  if (!data?.pod) {
    return <div className="text-xs text-muted-foreground">Pod not found</div>;
  }

  return (
    <KabinetPod.DetailLink object={data.pod}>
      <p className="text-xl">
        {data.pod.deployment.flavour?.release?.app.identifier}
      </p>
      <p className="text-sm">Deployed on {data.pod.backend.name}</p>
    </KabinetPod.DetailLink>
  );
};
