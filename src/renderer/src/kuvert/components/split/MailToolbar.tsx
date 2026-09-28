import { useDialog } from "@/core/dialogs/registry";
import { Separator } from "@/core/ui/separator";
import { TooltipButton } from "@/core/ui/tooltip-button";
import { Archive, Flag, FolderInput, Mail, Maximize2, ShieldBan, Trash2 } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/core/notify";
import { useKuvert } from "../../api/funcs";
import { CategoryChipFragment, FolderRole } from "../../api/graphql";
import { deleteMail, markRead, moveToRole, setFlagged, undoToast } from "../../mailOps";
import { CategoryButton } from "../categories/CategoryButton";
import { ReplyButtons } from "../MessageView";

const Divider = () => <Separator orientation="vertical" className="mx-1 h-5" />;

/**
 * The reading pane's toolbar, as Apple Mail's: file it (archive, trash,
 * junk, move), answer (reply, reply all, forward), mark it (flag, unread),
 * then the object's full menu and "open as a page". Acts on every mail shown;
 * the flag goes on the newest.
 */
export const MailToolbar = ({
  mail,
  newest,
  account,
  canSend,
  page,
  menu,
  onGone,
}: {
  /** Every mail the pane shows, with its categories. */
  mail: readonly { id: string; categories: readonly CategoryChipFragment[] }[];
  /** The mail Reply/Forward answer and the flag marks. */
  newest?: { id: string; isFlagged: boolean };
  /** The mailbox the mail is in. */
  account: string;
  canSend: boolean;
  /** The route of the full page. */
  page: string;
  /** The object's ObjectButton. */
  menu: React.ReactNode;
  /** The mail left this view (archived, trashed): clear the selection. */
  onGone: () => void;
}) => {
  const messages = mail.map((m) => m.id);
  const client = useKuvert();
  const { openDialog } = useDialog();
  const navigate = useNavigate();

  // Every change here waits out an undo window before it reaches the server:
  // the toast offers to take it back.
  const act = (work: () => Promise<unknown>, done: string, gone = true, affected = messages) =>
    work()
      .then(() => {
        undoToast(client, affected, done);
        if (gone) onGone();
      })
      .catch((e: Error) => toast.error(e.message));

  return (
    <div className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-0.5 border-b bg-background/80 px-2 backdrop-blur-md">
      <TooltipButton
        variant="ghost"
        size="icon-lg"
        tooltip="Archive"
        onClick={() => act(() => moveToRole(client, messages, FolderRole.Archive, "Archive"), "Archived")}
      >
        <Archive />
      </TooltipButton>
      <TooltipButton variant="ghost" size="icon-lg" tooltip="Move to Trash" onClick={() => act(() => deleteMail(client, messages, false), "Moved to Trash")}>
        <Trash2 />
      </TooltipButton>
      <TooltipButton
        variant="ghost"
        size="icon-lg"
        tooltip="Move to Junk"
        onClick={() => act(() => moveToRole(client, messages, FolderRole.Junk, "Junk"), "Moved to Junk")}
      >
        <ShieldBan />
      </TooltipButton>
      <TooltipButton variant="ghost" size="icon-lg" tooltip="Move to…" onClick={() => openDialog("kuvertmove", { messages }, { size: "small" })}>
        <FolderInput />
      </TooltipButton>
      <CategoryButton mail={mail} account={account} />
      {newest && canSend && (
        <>
          <Divider />
          <ReplyButtons message={newest} />
        </>
      )}
      <Divider />
      {newest && (
        <TooltipButton
          variant="ghost"
          size="icon-lg"
          tooltip={newest.isFlagged ? "Unflag" : "Flag"}
          onClick={() =>
            act(() => setFlagged(client, [newest.id], !newest.isFlagged), newest.isFlagged ? "Unflagged" : "Flagged", false, [newest.id])
          }
        >
          <Flag className={newest.isFlagged ? "fill-current text-primary" : undefined} />
        </TooltipButton>
      )}
      <TooltipButton variant="ghost" size="icon-lg" tooltip="Mark as unread" onClick={() => act(() => markRead(client, messages, false), "Marked unread")}>
        <Mail />
      </TooltipButton>
      <div className="ml-auto flex items-center gap-0.5">
        {menu}
        <TooltipButton variant="ghost" size="icon-lg" tooltip="Open as a page" onClick={() => navigate(page)}>
          <Maximize2 />
        </TooltipButton>
      </div>
    </div>
  );
};
