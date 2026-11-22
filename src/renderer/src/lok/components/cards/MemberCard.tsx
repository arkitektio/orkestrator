import React from "react";
import { IdCard, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/ui/avatar";
import { CARD_FRAME_SIZE, CardFrame, type CardFact } from "@/core/ui/card-frame";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { LokUser } from "@/core/linkers";
import { TeamMemberFragment } from "../../api/graphql";

type Membership = TeamMemberFragment;

/**
 * One member on the Team page, in the shared card frame like every other
 * model's card (`UserCard`'s look): their avatar large and faint behind the
 * name, their full name under it, their roles here at the foot. A smart
 * object, so right-click and the menu button carry the user's local actions
 * — "Notify + send message" among them.
 */
const TheCard = ({ membership, isMe }: { membership: Membership; isMe?: boolean }) => {
  const resolve = useLokResolve();
  const { user, roles } = membership;
  const avatar = user.profile?.avatar?.presignedUrl
    ? (resolve(user.profile.avatar.presignedUrl) as string)
    : undefined;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  const facts: CardFact[] = [
    ...(fullName ? [{ icon: IdCard, content: fullName, title: "Name" }] : []),
    ...(roles.length > 0
      ? [
          {
            icon: ShieldCheck,
            title: "Roles",
            at: "end" as const,
            content: <span className="truncate">{roles.map((role) => role.identifier).join(" · ")}</span>,
          },
        ]
      : []),
  ];

  return (
    <LokUser.Smart object={user} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      <CardFrame
        // You wear the theme colour; everyone else is a plain card.
        tone={isMe ? "brand" : "plain"}
        leading={
          <Avatar className="h-5 w-5 shrink-0">
            {avatar && <AvatarImage src={avatar} alt={user.username} />}
            <AvatarFallback className="text-[10px]">{user.username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        }
        watermark={
          avatar ? <img src={avatar} alt="" className="rounded-full object-cover" draggable={false} /> : undefined
        }
        title={
          <LokUser.DetailLink object={user} className="min-w-0 truncate hover:underline">
            {user.username}
          </LokUser.DetailLink>
        }
        badge={isMe ? <span className="text-xs font-normal text-muted-foreground">you</span> : undefined}
        facts={facts}
        stacked
        menu
      />
    </LokUser.Smart>
  );
};

export default React.memo(TheCard);
