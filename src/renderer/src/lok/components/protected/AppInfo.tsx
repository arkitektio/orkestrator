import { Guard } from "@/core/connection/arkitekt/host";
import { AppAvatar } from "../AppAvatar";

export const AppInfo = (props: { clientId: string | undefined }) => {
  return (
    <Guard.Lok notConnectedFallback="No userinfo available" connectingFallback="No userinfo available">
      {props.clientId && <AppAvatar clientId={props.clientId} />}
    </Guard.Lok>
  );
};
