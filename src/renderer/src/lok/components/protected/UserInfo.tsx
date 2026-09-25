import { Guard } from "@/app/Arkitekt";
import { LokUser } from "@/linkers";
import { UserAvatar } from "../UserAvatar";

export const UserInfo = (props: { sub: string | undefined }) => {
  return (
    <Guard.Lok notConnectedFallback="No userinfo available" connectingFallback="No userinfo available">
      {props.sub && <LokUser.DetailLink object={{ id: props.sub }}><UserAvatar sub={props.sub} /></LokUser.DetailLink>}
    </Guard.Lok>
  );
};
