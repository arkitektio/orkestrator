import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { useReportNotificationCount } from "@/core/dashboard/notificationCount";
import { MessageSquare } from "lucide-react";
import { useMyMentionsQuery } from "../api/graphql";

/**
 * The member's latest mentions, for the Notifications widget (kraph's
 * `notifications` slot section on `@lok/user`).
 */
export const MentionNotifications = () => {
  const { data } = useMyMentionsQuery({
    fetchPolicy: "cache-and-network",
  });

  useReportNotificationCount("kraph.mentions", data?.myMentions?.length ?? 0);

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
