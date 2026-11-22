import { useReportNotificationCount } from "@/core/dashboard/notificationCount";
import { Bell } from "lucide-react";
import { useMyActiveMessagesQuery, useWatchMyMessagesSubscription } from "../api/graphql";

/**
 * The messages sent to the member, under "Needs you" on the home page (lok's
 * `notifications` slot section on `@lok/user`).
 */
export const MessageNotifications = () => {
  const { data, refetch } = useMyActiveMessagesQuery({ fetchPolicy: "cache-and-network" });
  // Read again when a message is sent, read or removed, not only on focus.
  useWatchMyMessagesSubscription({ onData: () => void refetch() });
  const messages = data?.myActiveMessages ?? [];

  // Derived from `data`, not `onCompleted`: the latter does not fire when
  // Apollo answers straight out of the cache, which would leave the count at
  // zero and hide a list of messages.
  useReportNotificationCount("lok.messages", messages.length);

  return (
    <>
      {messages.map((message) => (
        <div key={message.id} className="flex items-start gap-2 rounded-lg bg-muted/50 p-2">
          <Bell className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs font-medium">{message.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{message.message}</p>
          </div>
        </div>
      ))}
    </>
  );
};
