import { AddressFragment, ListMessageFragment, ListThreadFragment } from "../../api/graphql";

/**
 * One row of a mail list, whatever it came from: what the row shows, and
 * what selecting it opens (a conversation or a single mail).
 */
export type MailRow = {
  /** The conversation's id, or the lone mail's. */
  id: string;
  /** What the reading pane opens. */
  kind: "thread" | "message";
  /** Who the row names: the participants of a conversation, the sender of a mail. */
  from: string;
  /** The mail the row previews (the newest of the conversation, in the listed folder). */
  message: ListMessageFragment;
  /** Mails in the conversation (1 for a lone mail). */
  count: number;
  unread: boolean;
  flagged: boolean;
  attachments: boolean;
};

const firstName = (a: AddressFragment) => a.name.trim().split(/\s+/)[0] || a.address.split("@")[0];

/**
 * "Anna, Ben & 2 more", as Apple Mail names a conversation; the mailbox's own
 * address reads "Me". One participant keeps the full name.
 */
export const participantsLabel = (participants: readonly AddressFragment[], own?: string) => {
  const self = own?.toLowerCase();
  const label = (a: AddressFragment) => (a.address.toLowerCase() === self ? "Me" : firstName(a));
  if (participants.length === 0) return "";
  if (participants.length === 1) {
    const [only] = participants;
    return only.address.toLowerCase() === self ? "Me" : only.name.trim() || only.address;
  }
  const names = participants.map(label);
  return names.length <= 3 ? names.join(", ") : `${names.slice(0, 2).join(", ")} & ${names.length - 2} more`;
};

/** Conversation rows; one without a mail in the listed folder is left out. */
export const rowsFromThreads = (threads: readonly ListThreadFragment[]): MailRow[] =>
  threads.flatMap((t) =>
    t.latestMessage
      ? [
          {
            id: t.id,
            kind: "thread" as const,
            from: participantsLabel(t.participants, t.account.emailAddress) || t.latestMessage.senderName,
            message: t.latestMessage,
            count: t.messageCount,
            unread: t.unreadCount > 0,
            flagged: t.flagged,
            attachments: t.hasAttachments,
          },
        ]
      : [],
  );

/** One row per mail (search results). */
export const rowsFromMessages = (messages: readonly ListMessageFragment[]): MailRow[] =>
  messages.map((m) => ({
    id: m.id,
    kind: "message" as const,
    from: m.senderName || m.senderAddress,
    message: m,
    count: 1,
    unread: !m.isRead,
    flagged: m.isFlagged,
    attachments: m.hasAttachments,
  }));
