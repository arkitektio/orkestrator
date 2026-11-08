import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { useClientQuery } from "../api/graphql";
import { clientAppVersion } from "../lib/clientLabels";

export const ClientImage = (props: { clientId: string, className?: string }) => {
  const { data } = useClientQuery({
    variables: {
      clientId: props.clientId,
    },
  });

  const resolve = useLokResolve();

  return (
    <img
      className={props.className}
      src={resolve(data?.client.logo?.presignedUrl)}
      alt={data?.client.name}
      loading="lazy"
    />
  );
};

export const JustClientName = (props: { clientId: string }) => {
  const { data } = useClientQuery({
    variables: {
      clientId: props.clientId,
    },
  });

  return <>{data?.client && clientAppVersion(data.client)}</>;
}
