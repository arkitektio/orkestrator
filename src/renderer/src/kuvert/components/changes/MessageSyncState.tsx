import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { CloudAlert, CloudOff, CloudUpload } from "lucide-react";
import React from "react";
import { useKuvert } from "../../api/funcs";
import { MailChangeState, MessageFragment, SyncState } from "../../api/graphql";
import { describeError } from "../../errors";
import { retryChanges, revertToServer, undoChanges } from "../../mailOps";
import { describeChange } from "./describe";

// The badge sits inside the card header's toggle button: a click on it (or in
// its popover, whose React events bubble through the portal) must not fold the card.
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

const Hint = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex" aria-label={text} onClick={stop}>
        {icon}
      </span>
    </TooltipTrigger>
    <TooltipContent>{text}</TooltipContent>
  </Tooltip>
);

/** A mail whose changes did not reach the server: why, and the ways out. */
const Failed = ({ message }: { message: MessageFragment }) => {
  const client = useKuvert();
  const failed = message.changes.filter((c) => c.state === MailChangeState.Failed);
  const run = (work: () => Promise<unknown>, done: string) =>
    work()
      .then(() => toast.success(done))
      .catch((e: Error) => toast.error(e.message));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label="Changes did not reach the server"
          className="inline-flex cursor-pointer rounded-sm text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={stop}
          onKeyDown={stop}
        >
          <CloudAlert className="size-3.5" />
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-80 flex-col gap-3 text-sm" onClick={stop} onKeyDown={stop}>
        <div className="font-medium">Not on the server</div>
        <ul className="flex flex-col gap-2">
          {failed.map((c) => (
            <li key={c.id} className="flex flex-col gap-0.5">
              <span>{describeChange(c)}</span>
              <span className="text-xs text-muted-foreground">{describeError(c.errorCode, { message: c.error }).text}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => run(() => revertToServer(client, [message.id]), "Back to what the server has")}
          >
            Revert to server
          </Button>
          <Button size="sm" variant="outline" onClick={() => run(() => undoChanges(client, { messages: [message.id] }), "Undone")}>
            Undo
          </Button>
          {failed.length > 0 && (
            <Button size="sm" onClick={() => run(() => retryChanges(client, failed.map((c) => c.id)), "Queued again")}>
              Retry
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

/** How a mail here relates to the server, in its card header (null when SYNCED). */
export const MessageSyncState = ({ message }: { message: MessageFragment }) => {
  switch (message.syncState) {
    case SyncState.Pending:
      return <Hint icon={<CloudUpload className="size-3.5" />} text="Changed here; on its way to the server" />;
    case SyncState.Local:
      return <Hint icon={<CloudOff className="size-3.5" />} text="Changed here only; the server keeps it as it was" />;
    case SyncState.Failed:
      return <Failed message={message} />;
    default:
      return null;
  }
};
