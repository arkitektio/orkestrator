import { StructureDisplay } from "@/components/display/StructureDisplay";
import { useRegisterDashboardWidget } from "../hooks";
import { Guard } from "@/app/Arkitekt";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyMentionsQuery } from "@/kraph/api/graphql";
import {
  useMyActiveMessagesQuery,
  useUsersQuery,
} from "@/lok/api/graphql";

import { Bell, MessageSquare, Users } from "lucide-react";
import { useEffect, useState } from "react";

// ── Notifications widget ──

// Messages come from lok and mentions from kraph, and a component cannot guard
// one of its own hooks — so the two halves are separate components, each behind
// its own service. They report emptiness upward only so the widget can say
// "nothing new" once rather than twice.

const MessagesList = ({ onCount }: { onCount: (n: number) => void }) => {
  const { data } = useMyActiveMessagesQuery({
    fetchPolicy: "cache-and-network",
  });

  // Derived from `data`, not `onCompleted` — the latter does not fire when
  // Apollo answers straight out of the cache, which would leave the count at
  // zero and print "No new notifications" above a list of them.
  const count = data?.myActiveMessages?.length ?? 0;
  useEffect(() => onCount(count), [count, onCount]);

  return (
    <>
      {(data?.myActiveMessages ?? []).map((msg) => (
        <div key={msg.id} className="p-2 rounded-lg bg-muted/50 space-y-0.5">
          <p className="text-xs font-medium">{msg.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {msg.message}
          </p>
        </div>
      ))}
    </>
  );
};

const MentionsList = ({ onCount }: { onCount: (n: number) => void }) => {
  const { data } = useMyMentionsQuery({
    fetchPolicy: "cache-and-network",
  });

  const count = data?.myMentions?.length ?? 0;
  useEffect(() => onCount(count), [count, onCount]);

  return (
    <>
      {(data?.myMentions ?? []).slice(0, 5).map((mention) => (
        <div
          key={mention.id}
          className="p-2 rounded-lg bg-muted/50 flex items-start gap-2"
        >
          <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                <StructureDisplay identifier="@lok/user" id={mention.assertion.subject} variant="inline" />
              </span>{" "}
              mentioned you
            </p>
            {/* kraph renders the body to plain text for us — no walking the
                descendant tree for a one-line preview. */}
            <p className="text-xs text-muted-foreground truncate">
              {mention.text}
            </p>
          </div>
        </div>
      ))}
    </>
  );
};

const NotificationsWidget = () => {
  const [messageCount, setMessageCount] = useState(0);
  const [mentionCount, setMentionCount] = useState(0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        <MessagesList onCount={setMessageCount} />
        <Guard.Kraph unavailable={<></>}>
          <MentionsList onCount={setMentionCount} />
        </Guard.Kraph>
        {messageCount === 0 && mentionCount === 0 && (
          <p className="text-xs text-muted-foreground">No new notifications</p>
        )}
      </div>
    </div>
  );
};

// ── Team widget ──

const TeamWidget = () => {
  const { data, loading } = useUsersQuery({
    variables: { pagination: { limit: 8 } },
    fetchPolicy: "cache-and-network",
  });

  const users = data?.users ?? [];

  return (
    <div className="flex flex-col h-full">
      {loading ? (
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-8 h-8 rounded-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {users.map((user) => (
            <div key={user.id} className="flex flex-col items-center gap-1">
              <Avatar size="sm">
                {user.profile?.avatar?.presignedUrl ? (
                  <AvatarImage src={user.profile.avatar.presignedUrl} />
                ) : null}
                <AvatarFallback>
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground truncate max-w-[48px]">
                {user.username}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Registration component ──

export const BuiltinDashboardWidgets = () => {
  useRegisterDashboardWidget({
    key: "notifications",
    label: "Notifications",
    module: "lok",
    icon: <Bell className="w-3 h-3" />,
    component: () => <NotificationsWidget />,
    defaultSize: "1x2",
    defaultWidth: 25,
    defaultHeight: 100,
  });

  useRegisterDashboardWidget({
    key: "team",
    label: "Team",
    module: "lok",
    icon: <Users className="w-3 h-3 text-primary/40" />,
    component: () => <TeamWidget />,
    defaultSize: "1x2",
    defaultWidth: 25,
    defaultHeight: 100,
  });

  return null;
};
