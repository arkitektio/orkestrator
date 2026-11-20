import React from "react";
import { AtSign, IdCard } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/ui/avatar";
import { CARD_FRAME_SIZE, CardFrame, type CardFact } from "@/core/ui/card-frame";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { LokUser } from "@/core/linkers";
import { ListUserFragment } from "../../api/graphql";

interface Props {
  item: ListUserFragment;
}

/** A user: their avatar large and faint behind their name, and how to reach them. */
const TheCard = ({ item }: Props) => {
  const resolve = useLokResolve();
  const avatar = item.profile?.avatar?.presignedUrl ? (resolve(item.profile.avatar.presignedUrl) as string) : undefined;
  const fullName = [item.firstName, item.lastName].filter(Boolean).join(" ");
  const facts: CardFact[] = [
    ...(fullName ? [{ icon: IdCard, content: fullName, title: "Name" }] : []),
    ...(item.email ? [{ icon: AtSign, content: item.email, title: "Email", at: "end" as const }] : []),
  ];

  return (
    <LokUser.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      <CardFrame
        tone="brand"
        leading={
          <Avatar className="h-5 w-5 shrink-0">
            {avatar && <AvatarImage src={avatar} alt={item.username} />}
            <AvatarFallback className="text-[10px]">{item.username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        }
        watermark={avatar ? <img src={avatar} alt="" className="rounded-full object-cover" draggable={false} /> : undefined}
        title={
          <LokUser.DetailLink object={item} className="min-w-0 truncate hover:underline">
            {item.username}
          </LokUser.DetailLink>
        }
        facts={facts}
        stacked
        menu
      />
    </LokUser.Smart>
  );
};

export default React.memo(TheCard);
