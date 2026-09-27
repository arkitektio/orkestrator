import { FolderRole } from "./api/graphql";

export type MailAddress = { name?: string | null; address: string };

/** As Apple Mail lists mail: "14:02" today, "Yesterday", "Tuesday" this week, else the date. */
export const formatMailDate = (iso: string | null | undefined, now = new Date()) => {
  if (!iso) return "";
  const date = new Date(iso);
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(date)) / 86_400_000);
  if (days === 0) return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days > 1 && days < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, { day: "numeric", month: "numeric", year: "2-digit" });
};

/** The full date and time, for a message header. */
export const formatMailDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

/** The name if there is one, else the address. */
export const addressLabel = (a: MailAddress) => a.name?.trim() || a.address;

/** `Name <address>`, or the bare address. */
export const formatAddress = (a: MailAddress) => (a.name?.trim() ? `${a.name.trim()} <${a.address}>` : a.address);

const ADDRESS = /^[^\s@<>"]+@[^\s@<>"]+$/;

/**
 * Recipients typed into a field: comma or semicolon separated, each
 * `address`, `<address>` or `Name <address>` (a quoted name may hold commas).
 * What does not read as an address comes back in `invalid`.
 */
export const parseRecipients = (text: string): { recipients: MailAddress[]; invalid: string[] } => {
  const parts: string[] = [];
  let current = "";
  let quoted = false;
  let angled = false;
  for (const ch of text) {
    if (ch === '"') quoted = !quoted;
    if (!quoted && ch === "<") angled = true;
    if (!quoted && ch === ">") angled = false;
    if (!quoted && !angled && (ch === "," || ch === ";" || ch === "\n")) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);

  const recipients: MailAddress[] = [];
  const invalid: string[] = [];
  for (const raw of parts.map((p) => p.trim()).filter(Boolean)) {
    const angle = raw.match(/^(.*)<([^<>]+)>$/);
    const address = (angle ? angle[2] : raw).trim();
    const name = angle ? angle[1].trim().replace(/^"(.*)"$/, "$1").trim() : "";
    if (ADDRESS.test(address)) recipients.push(name ? { name, address } : { address });
    else invalid.push(raw);
  }
  return { recipients, invalid };
};

/** Recipients back into the text a field shows. */
export const recipientsText = (list: MailAddress[]) => list.map(formatAddress).join(", ");

const PREFIX = /^\s*((re|aw|sv|fw|fwd|wg)\s*(\[\d+\])?\s*:\s*)+/i;

/** "Re: " + the subject, without stacking prefixes. */
export const replySubject = (subject: string) => `Re: ${subject.replace(PREFIX, "")}`;

/** "Fwd: " + the subject, without stacking prefixes. */
export const forwardSubject = (subject: string) => `Fwd: ${subject.replace(PREFIX, "")}`;

type Quotable = {
  textBody: string;
  date?: string | null;
  sender: MailAddress;
  subject: string;
  to: MailAddress[];
  cc: MailAddress[];
};

/** The original below a reply: an attribution line, then the text with "> " before each line. */
export const quoteForReply = (m: Quotable) =>
  `\n\nOn ${formatMailDateTime(m.date)}, ${formatAddress(m.sender)} wrote:\n` +
  m.textBody
    .replace(/\s+$/, "")
    .split("\n")
    .map((line) => (line.startsWith(">") ? `>${line}` : `> ${line}`))
    .join("\n");

/** The original below a forward, with its headers. */
export const quoteForForward = (m: Quotable) =>
  [
    "",
    "",
    "---------- Forwarded message ----------",
    `From: ${formatAddress(m.sender)}`,
    m.date ? `Date: ${formatMailDateTime(m.date)}` : null,
    `Subject: ${m.subject}`,
    m.to.length ? `To: ${recipientsText(m.to)}` : null,
    m.cc.length ? `Cc: ${recipientsText(m.cc)}` : null,
    "",
    m.textBody.replace(/\s+$/, ""),
  ]
    .filter((line) => line !== null)
    .join("\n");

/**
 * Just the name and address — what `RecipientInput` takes. A fetched `Address`
 * also carries `__typename`, which the server rejects on input.
 */
export const plainAddress = (a: MailAddress): MailAddress =>
  a.name ? { name: a.name, address: a.address } : { address: a.address };

type Repliable = { sender: MailAddress; replyTo: MailAddress[]; to: MailAddress[]; cc: MailAddress[] };

/**
 * Who a reply goes to. Reply: Reply-To, else the sender. Reply all: also every
 * other To and Cc, minus the mailbox's own address and duplicates. A reply to
 * one's own sent mail goes back to its recipients. Plain addresses, ready to
 * send as they are.
 */
export const replyRecipients = (m: Repliable, own: string, all: boolean): { to: MailAddress[]; cc: MailAddress[] } => {
  const self = own.toLowerCase();
  const isSelf = (a: MailAddress) => a.address.toLowerCase() === self;
  const fromSelf = isSelf(m.sender);
  const primary = fromSelf ? m.to : m.replyTo.length ? m.replyTo : [m.sender];

  const seen = new Set<string>();
  const keep = (a: MailAddress) => {
    const key = a.address.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  // Never to oneself, unless one wrote only to oneself.
  const others = primary.filter((a) => !isSelf(a));
  const to = (others.length ? others : primary).filter(keep).map(plainAddress);
  if (!all) return { to, cc: [] };
  const rest = fromSelf ? m.cc : [...m.to, ...m.cc];
  return { to, cc: rest.filter((a) => !isSelf(a)).filter(keep).map(plainAddress) };
};

const ROLE_ORDER: FolderRole[] = [
  FolderRole.Inbox,
  FolderRole.Flagged,
  FolderRole.Drafts,
  FolderRole.Sent,
  FolderRole.Archive,
  FolderRole.All,
  FolderRole.Junk,
  FolderRole.Trash,
  FolderRole.Other,
];

/** Folders as a mail client lists them: the special folders (Inbox … Trash), then user folders by path. */
export const sortFolders = <T extends { role: FolderRole; path: string }>(folders: readonly T[]) =>
  [...folders].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.path.localeCompare(b.path),
  );

/** "1.2 MB" */
export const formatBytes = (bytes: number | null | undefined) => {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
};
