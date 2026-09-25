import { Badge } from "@/core/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card";
import { useMyMentionsQuery } from "@/kraph/api/graphql";
import { SmartLink } from "@/core/providers/smart/builder";
import { formatDistanceToNow } from "date-fns";
import { Clock, MessageSquare, User } from "lucide-react";
import { Comment } from "../komments/display/Comment";

const Header = () => (
  <CardHeader>
    <div className="flex items-center space-x-2">
      <MessageSquare className="h-5 w-5 text-muted-foreground" />
      <CardTitle>Latest Mentions</CardTitle>
    </div>
    <CardDescription>Recent mentions and notifications</CardDescription>
  </CardHeader>
);

/**
 * Remarks that name the caller. A mention carries the structure it was made
 * about, so it links back to the datum under discussion rather than to a
 * comment page — a comment is a claim about something, and that something is
 * what you want to open.
 */
export const LatestMentionsSection = () => {
  const { data, loading } = useMyMentionsQuery();

  if (loading) {
    return (
      <div>
        <Header />
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </div>
    );
  }

  if (!data?.myMentions || data.myMentions.length === 0) {
    return (
      <div>
        <Header />
        <CardContent>
          <Card className="flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p>No mentions yet</p>
            <p className="text-xs mt-1">
              You&apos;ll see mentions here when others tag you
            </p>
          </Card>
        </CardContent>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Latest Mentions</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {data.myMentions.length} mention
            {data.myMentions.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <CardDescription>Recent mentions and notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.myMentions.slice(0, 5).map((mention) => (
          <div
            key={mention.id}
            className="flex space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex-shrink-0">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <SmartLink
                identifier={mention.structure.identifier}
                object={mention.structure.object}
                className="block hover:text-foreground"
              >
                <div className="mb-2">
                  <Comment comment={mention} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(mention.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </span>
                  <span>#{mention.id.slice(-8)}</span>
                </div>
              </SmartLink>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
