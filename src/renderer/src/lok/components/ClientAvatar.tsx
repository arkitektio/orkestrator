import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { clientAppVersion } from "../lib/clientLabels";
import { useClientChip } from "../lib/keyedChips";

// Rows name clients by their OAuth client id; every row on a page is looked up
// in one batched request (`useClientChip`).

export const ClientImage = (props: { clientId: string, className?: string }) => {
  const client = useClientChip(props.clientId);
  const resolve = useLokResolve();

  return (
    <img
      className={props.className}
      src={resolve(client?.logo?.presignedUrl)}
      alt={client?.name}
      loading="lazy"
    />
  );
};

export const JustClientName = (props: { clientId: string }) => {
  const client = useClientChip(props.clientId);
  return <>{client && clientAppVersion(client)}</>;
};
