import type { DisplayWidgetProps } from "@/lib/display/registry";
import { AppAvatar } from "../components/AppAvatar";
import { ClientImage, JustClientName } from "../components/ClientAvatar";
import { useDetailClientQuery } from "../api/graphql";
import { clientAppVersion } from "../lib/clientLabels";

/**
 * `@lok/client`. Other modules record the client that did something by its
 * OAuth `clientId` (`by="clientId"`); lok's own pages address it by id.
 */
export const ClientDisplay = ({ id, by, variant, className }: DisplayWidgetProps) => {
  if (by === "clientId") {
    switch (variant) {
      case "inline":
        return <JustClientName clientId={id} />;
      case "avatar":
        return <ClientImage clientId={id} className={className} />;
      default:
        return <AppAvatar clientId={id} />;
    }
  }
  return <ClientById id={id} />;
};

const ClientById = ({ id }: { id: string }) => {
  const { data } = useDetailClientQuery({ variables: { id } });
  return <>{data?.client && clientAppVersion(data.client)}</>;
};
