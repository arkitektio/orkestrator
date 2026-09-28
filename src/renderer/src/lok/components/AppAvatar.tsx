import { useClientQuery } from "../api/graphql";
import { clientAppIdentifier } from "../lib/clientLabels";

export const AppAvatar = (props: { clientId: string }) => {
  const { data } = useClientQuery({
    variables: {
      clientId: props.clientId,
    },
  });

  return (
    <div className="px-2 bg-muted rounded rounded-md inline">
      {data?.client && clientAppIdentifier(data.client)}
    </div>
  );
};
