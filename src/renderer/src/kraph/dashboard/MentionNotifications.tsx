import { SmartLink } from "@/core/smart/builder";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { useReportNotificationCount } from "@/core/dashboard/notificationCount";
import { MessageSquare } from "lucide-react";
import { useMyMentionsQuery } from "../api/graphql";

/**
 * The member's latest mentions, under "Needs you" on the home page (kraph's
 * `notifications` slot section on `@lok/user`). A mention carries the
 * structure it was made about, so the row opens that, not a comment page: a
 * comment is a claim about something, and that something is what you want.
 */
export const MentionNotifications = () => {
  const { data } = useMyMentionsQuery({
    fetchPolicy: "cache-and-network",
  });

  // The server counts the open ones: a resolved mention clears the badge.
  useReportNotificationCount("kraph.mentions", data?.myMentionCount ?? 0);

  return (
    <>
      {(data?.myMentions ?? []).map((mention) => (
        <SmartLink
          key={mention.id}
          identifier={mention.structure.identifier}
          object={mention.structure.object}
          className="flex items-start gap-2 rounded-lg bg-muted/50 p-2 transition-colors hover:bg-muted"
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
        </SmartLink>
      ))}
    </>
  );
};
