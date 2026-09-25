import { Guard } from "@/app/Arkitekt";
import { AppAvatar } from "../AppAvatar";

export const AppInfo = (props: { clientId: string | undefined }) => {
  return (
    <Guard.Lok notConnectedFallback="No userinfo available" connectingFallback="No userinfo available">
      {props.clientId && <AppAvatar clientId={props.clientId} />}
    </Guard.Lok>
  );
};
