import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Card } from "@/core/components/ui/card";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { LokUser } from "@/core/linkers";
import { cn } from "@/core/lib/utils";
import React from "react";
import { OrganizationFragment } from "../../api/graphql";

type Membership = OrganizationFragment["memberships"][number];

/**
 * One member on the Team page: who they are and what they may do here. A
 * smart object, so right-click and the hover button carry the user's local
 * actions — "Notify + send message" among them.
 */
const TheCard = ({ membership, isMe }: { membership: Membership; isMe?: boolean }) => {
  const resolve = useLokResolve();
  const { user, roles } = membership;
  const avatar = user.profile?.avatar?.presignedUrl;

  return (
    <LokUser.Smart object={user}>
      <LokUser.DetailLink object={user} className={() => "group block h-full"}>
        <Card
          className={cn(
            "flex h-full items-center gap-3 p-3 transition-colors group-hover:bg-muted/40",
            isMe && "ring-1 ring-primary/30",
          )}
        >
          <Avatar className="h-10 w-10 shrink-0">
            {avatar && <AvatarImage src={resolve(avatar)} alt={user.username} />}
            <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="flex items-baseline gap-2 truncate text-sm font-medium">
              {user.username}
              {isMe && <span className="text-xs font-normal text-muted-foreground">you</span>}
            </p>
            {roles.length > 0 && (
              <p className="truncate text-xs text-muted-foreground">
                {roles.map((role) => role.identifier).join(" · ")}
              </p>
            )}
          </div>
        </Card>
      </LokUser.DetailLink>
    </LokUser.Smart>
  );
};

export default React.memo(TheCard);
