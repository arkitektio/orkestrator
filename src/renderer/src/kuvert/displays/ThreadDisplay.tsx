import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { useListThreadsQuery } from "../api/graphql";
import ThreadCard from "../components/cards/ThreadCard";
import { MailThread } from "../linkers";

/** `@kuvert/thread` wherever another module shows one (the list row's data, not the whole conversation). */
export const ThreadDisplay = (props: DisplayWidgetProps) => {
  const { data } = useListThreadsQuery({ variables: { filters: { ids: [props.id] }, pagination: { limit: 1 } } });
  const thread = data?.threads[0];
  if (!thread) return <span className="text-xs text-muted-foreground">Conversation</span>;

  if (props.variant === "card") return <ThreadCard item={thread} />;
  return (
    <MailThread.DetailLink object={thread} className="inline-flex min-w-0 items-center gap-2 text-sm">
      <span className="truncate">{thread.subject || "(no subject)"}</span>
      {props.variant === "chip" && thread.messageCount > 1 && (
        <span className="text-xs text-muted-foreground">{thread.messageCount}</span>
      )}
    </MailThread.DetailLink>
  );
};
