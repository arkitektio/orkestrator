import { Guard } from "@/core/lib/arkitekt/host";
import { LokUser } from "@/core/linkers";
import { UserAvatar } from "../UserAvatar";

export const UserInfo = (props: { sub: string | undefined }) => {
  return (
    <Guard.Lok notConnectedFallback="No userinfo available" connectingFallback="No userinfo available">
      {props.sub && <LokUser.DetailLink object={{ id: props.sub }}><UserAvatar sub={props.sub} /></LokUser.DetailLink>}
    </Guard.Lok>
  );
};
