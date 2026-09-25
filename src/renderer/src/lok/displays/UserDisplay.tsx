import type { DisplayWidgetProps } from "@/lib/display/registry";
import { UserInfo } from "../components/protected/UserInfo";
import { JustUsername, UserAvatar, UserAvatarUsername } from "../components/UserAvatar";

/**
 * `@lok/user`, addressed by the user's id (the `sub`), in whichever shape the
 * embedding UI asks for. Other modules show people through this display
 * (`<StructureDisplay identifier="@lok/user" id={sub} variant="inline" />`),
 * never by importing lok's components.
 */
export const UserDisplay = ({ id, variant, className }: DisplayWidgetProps) => {
  switch (variant) {
    case "inline":
      return <JustUsername sub={id} />;
    case "avatar":
      return <UserAvatar sub={id} className={className} />;
    case "chip":
      return <UserAvatarUsername sub={id} />;
    default:
      return <UserInfo sub={id} />;
  }
};
