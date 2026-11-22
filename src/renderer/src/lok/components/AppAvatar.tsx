import { clientAppIdentifier } from "../lib/clientLabels";
import { useClientChip } from "../lib/keyedChips";

/** A client's app, by its OAuth client id: looked up with every other row in one request. */
export const AppAvatar = (props: { clientId: string }) => {
  const client = useClientChip(props.clientId);

  return (
    <div className="px-2 bg-muted rounded rounded-md inline">
      {client && clientAppIdentifier(client)}
    </div>
  );
};
