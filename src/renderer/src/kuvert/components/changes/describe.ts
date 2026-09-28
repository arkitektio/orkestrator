import { MailChangeFragment, MailChangeKind, MailChangeState } from "../../api/graphql";

type Folder = { name: string } | null | undefined;

const FLAG_WORDS: Record<string, [add: string, remove: string]> = {
  "\\Seen": ["Mark read", "Mark unread"],
  "\\Flagged": ["Flag", "Unflag"],
  "\\Answered": ["Mark answered", "Unmark answered"],
  "\\Deleted": ["Mark deleted", "Unmark deleted"],
  "\\Draft": ["Mark as draft", "Unmark as draft"],
};

const flagWords = (flag: string, add: boolean) => {
  const known = FLAG_WORDS[flag];
  if (known) return known[add ? 0 : 1];
  return add ? `Add keyword ${flag}` : `Remove keyword ${flag}`;
};

const folderName = (folder: Folder) => folder?.name ?? "a folder";

/** What a queued change does, in words ("Mark read, Flag", "Move from Inbox to Archive"). */
export const describeChange = (change: Pick<MailChangeFragment, "kind" | "add" | "remove" | "originFolder" | "targetFolder">) => {
  switch (change.kind) {
    case MailChangeKind.Flags: {
      const words = [...change.add.map((f) => flagWords(f, true)), ...change.remove.map((f) => flagWords(f, false))];
      return words.join(", ") || "Change flags";
    }
    case MailChangeKind.Move:
      return change.originFolder
        ? `Move from ${folderName(change.originFolder)} to ${folderName(change.targetFolder)}`
        : `Move to ${folderName(change.targetFolder)}`;
    case MailChangeKind.Expunge:
      return "Delete for good";
    case MailChangeKind.PopDele:
      return "Delete on the POP3 server";
    default:
      return "Change";
  }
};

/**
 * Where a change is, relative to `now`: waiting out its undo window, backing
 * off after failed attempts, due now, or failed.
 */
export const changeStatus = (
  change: Pick<MailChangeFragment, "state" | "attempts" | "pushAfter">,
  now: number = Date.now(),
): "undo-window" | "backing-off" | "due" | "failed" => {
  if (change.state === MailChangeState.Failed) return "failed";
  if (new Date(change.pushAfter).getTime() <= now) return "due";
  return change.attempts > 0 ? "backing-off" : "undo-window";
};
