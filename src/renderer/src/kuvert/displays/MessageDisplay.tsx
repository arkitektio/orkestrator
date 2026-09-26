import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { useGetMessageQuery } from "../api/graphql";
import MessageCard from "../components/cards/MessageCard";
import { MailMessage } from "../linkers";

/** `@kuvert/message` wherever another module shows one. */
export const MessageDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetMessageQuery({ variables: { id: props.id } });
  const message = data?.message;
  if (!message) return <span className="text-xs text-muted-foreground">Mail</span>;

  if (props.variant === "inline" || props.variant === "avatar") {
    return <MailMessage.DetailLink object={message}>{message.subject || "(no subject)"}</MailMessage.DetailLink>;
  }
  if (props.variant === "chip") {
    return (
      <MailMessage.DetailLink object={message} className="inline-flex min-w-0 items-center gap-2 text-sm">
        <span className="truncate">{message.subject || "(no subject)"}</span>
        <span className="truncate text-xs text-muted-foreground">{message.senderName || message.senderAddress}</span>
      </MailMessage.DetailLink>
    );
  }
  return <MessageCard item={message} />;
};
